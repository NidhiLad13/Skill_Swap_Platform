from odoo import models, fields, api, exceptions
from datetime import datetime, timedelta


class SwapRequest(models.Model):
    _name = 'swap.request'
    _description = 'Skill Swap Request'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'create_date desc'

    name = fields.Char(string='Request Reference', required=True, copy=False, readonly=True, default='New')
    requester_id = fields.Many2one('res.users', string='Requester', required=True, ondelete='cascade')
    provider_id = fields.Many2one('res.users', string='Provider', required=True, ondelete='cascade')
    requester_skill_id = fields.Many2one('user.skill', string='Skill Offered by Requester', required=True)
    provider_skill_id = fields.Many2one('user.skill', string='Skill Wanted from Provider', required=True)

    state = fields.Selection([
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ], string='Status', default='pending', tracking=True)

    message = fields.Text(string='Message from Requester')
    response_message = fields.Text(string='Response from Provider')

    requested_date = fields.Datetime(string='Requested Date', default=fields.Datetime.now)
    response_date = fields.Datetime(string='Response Date')
    scheduled_date = fields.Datetime(string='Scheduled Date')
    completion_date = fields.Datetime(string='Completion Date')

    # Duration and meeting details
    estimated_duration = fields.Float(string='Estimated Duration (hours)')
    meeting_type = fields.Selection([
        ('online', 'Online'),
        ('offline', 'In Person'),
        ('hybrid', 'Hybrid')
    ], string='Meeting Type', default='online')
    meeting_location = fields.Char(string='Meeting Location')
    meeting_link = fields.Char(string='Meeting Link')

    # Ratings
    requester_rating_id = fields.Many2one('swap.rating', string='Requester Rating')
    provider_rating_id = fields.Many2one('swap.rating', string='Provider Rating')

    # Expiry
    expiry_date = fields.Datetime(string='Expiry Date', compute='_compute_expiry_date', store=True)
    is_expired = fields.Boolean(string='Is Expired', compute='_compute_is_expired')

    @api.depends('requested_date')
    def _compute_expiry_date(self):
        for record in self:
            if record.requested_date:
                record.expiry_date = record.requested_date + timedelta(days=30)
            else:
                record.expiry_date = False

    @api.depends('expiry_date')
    def _compute_is_expired(self):
        now = fields.Datetime.now()
        for record in self:
            record.is_expired = record.expiry_date and record.expiry_date < now and record.state == 'pending'

    @api.model
    def create(self, vals):
        if vals.get('name', 'New') == 'New':
            vals['name'] = self.env['ir.sequence'].next_by_code('swap.request') or 'New'
        return super(SwapRequest, self).create(vals)

    def action_accept(self):
        self.write({
            'state': 'accepted',
            'response_date': fields.Datetime.now()
        })
        self.message_post(body="Swap request has been accepted!")
        return True

    def action_reject(self):
        self.write({
            'state': 'rejected',
            'response_date': fields.Datetime.now()
        })
        self.message_post(body="Swap request has been rejected!")
        return True

    def action_complete(self):
        self.write({
            'state': 'completed',
            'completion_date': fields.Datetime.now()
        })
        self.message_post(body="Swap has been completed!")
        return True

    def action_cancel(self):
        self.write({'state': 'cancelled'})
        self.message_post(body="Swap request has been cancelled!")
        return True

    @api.constrains('requester_id', 'provider_id')
    def _check_different_users(self):
        for record in self:
            if record.requester_id == record.provider_id:
                raise exceptions.ValidationError("You cannot create a swap request with yourself!")