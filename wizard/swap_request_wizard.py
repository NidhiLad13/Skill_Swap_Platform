from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class SwapRequestWizard(models.TransientModel):
    _name = 'swap.request.wizard'
    _description = 'Skill Swap Request Wizard'

    requester_skill_id = fields.Many2one(
        'user.skill',
        string='Your Skill to Offer',
        required=True,
        domain="[('user_id', '=', uid), ('is_offered', '=', True)]"
    )
    provider_skill_id = fields.Many2one(
        'user.skill',
        string='Skill to Request',
        required=True,
        domain="[('is_offered', '=', True), ('is_public', '=', True), ('user_id', '!=', uid)]"
    )
    message = fields.Text(
        string='Message',
        help='Introduce yourself and explain what you\'d like to learn'
    )
    meeting_type = fields.Selection([
        ('online', 'Online'),
        ('in_person', 'In Person'),
        ('both', 'Both')
    ], string='Meeting Type', default='online', required=True)
    estimated_duration = fields.Float(
        string='Estimated Duration (hours)',
        default=1.0,
        help='Estimated duration for the skill exchange'
    )

    @api.constrains('requester_skill_id', 'provider_skill_id')
    def _check_different_skills(self):
        for wizard in self:
            if wizard.requester_skill_id.user_id == wizard.provider_skill_id.user_id:
                raise ValidationError(_('You cannot request a skill swap with yourself.'))

    @api.constrains('estimated_duration')
    def _check_duration(self):
        for wizard in self:
            if wizard.estimated_duration <= 0:
                raise ValidationError(_('Duration must be greater than 0.'))

    def action_create_request(self):
        """Create the swap request"""
        self.ensure_one()

        # Check if there's already a pending request
        existing_request = self.env['swap.request'].search([
            ('requester_id', '=', self.env.user.id),
            ('provider_id', '=', self.provider_skill_id.user_id.id),
            ('requester_skill_id', '=', self.requester_skill_id.id),
            ('provider_skill_id', '=', self.provider_skill_id.id),
            ('state', 'in', ['pending', 'accepted'])
        ])

        if existing_request:
            raise ValidationError(_('You already have a pending or accepted request for this skill swap.'))

        # Create the request
        request = self.env['swap.request'].create({
            'requester_id': self.env.user.id,
            'provider_id': self.provider_skill_id.user_id.id,
            'requester_skill_id': self.requester_skill_id.id,
            'provider_skill_id': self.provider_skill_id.id,
            'message': self.message,
            'meeting_type': self.meeting_type,
            'estimated_duration': self.estimated_duration,
        })

        # Send notification email
        template = self.env.ref('skill_swap_platform.email_template_swap_request', raise_if_not_found=False)
        if template:
            template.send_mail(request.id, force_send=True)

        return {
            'type': 'ir.actions.act_window',
            'name': _('Skill Swap Request'),
            'res_model': 'swap.request',
            'res_id': request.id,
            'view_mode': 'form',
            'view_type': 'form',
            'target': 'current',
        }


class SwapRequestResponseWizard(models.TransientModel):
    _name = 'swap.request.response.wizard'
    _description = 'Skill Swap Request Response Wizard'

    request_id = fields.Many2one('swap.request', string='Request', required=True)
    action_type = fields.Selection([
        ('accept', 'Accept'),
        ('reject', 'Reject')
    ], string='Action', required=True)
    response_message = fields.Text(string='Response Message')

    @api.model
    def default_get(self, fields):
        res = super().default_get(fields)
        if 'request_id' in fields and self.env.context.get('active_id'):
            res['request_id'] = self.env.context.get('active_id')
        return res

    def action_respond(self):
        """Respond to the swap request"""
        self.ensure_one()

        if self.action_type == 'accept':
            self.request_id.write({
                'state': 'accepted',
                'response_message': self.response_message,
                'response_date': fields.Datetime.now()
            })

            # Send acceptance email
            template = self.env.ref('skill_swap_platform.email_template_swap_accepted', raise_if_not_found=False)
            if template:
                template.send_mail(self.request_id.id, force_send=True)

        elif self.action_type == 'reject':
            self.request_id.write({
                'state': 'rejected',
                'response_message': self.response_message,
                'response_date': fields.Datetime.now()
            })

        return {'type': 'ir.actions.act_window_close'}