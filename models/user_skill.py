from odoo import models, fields, api, exceptions


class UserSkill(models.Model):
    _name = 'user.skill'
    _description = 'User Skills'
    _rec_name = 'skill_name'

    user_id = fields.Many2one('res.users', string='User', required=True, ondelete='cascade')
    skill_name = fields.Char(string='Skill Name', required=True)
    category_id = fields.Many2one('skill.category', string='Category', required=True)
    skill_level = fields.Selection([
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert')
    ], string='Skill Level', required=True)
    description = fields.Text(string='Description')
    is_offered = fields.Boolean(string='Offering This Skill', default=False)
    is_wanted = fields.Boolean(string='Want to Learn This Skill', default=False)
    availability = fields.Selection([
        ('weekdays', 'Weekdays'),
        ('weekends', 'Weekends'),
        ('evenings', 'Evenings'),
        ('flexible', 'Flexible')
    ], string='Availability')
    location = fields.Char(string='Location')
    is_public = fields.Boolean(string='Public Profile', default=True)
    created_date = fields.Datetime(string='Created Date', default=fields.Datetime.now)

    # Computed fields
    swap_requests_sent = fields.One2many('swap.request', 'requester_skill_id', string='Swap Requests Sent')
    swap_requests_received = fields.One2many('swap.request', 'provider_skill_id', string='Swap Requests Received')

    @api.constrains('is_offered', 'is_wanted')
    def _check_skill_type(self):
        for record in self:
            if not record.is_offered and not record.is_wanted:
                raise exceptions.ValidationError("A skill must be either offered or wanted (or both).")

    @api.model
    def search_skills(self, domain=None, skill_name=None, category_id=None, location=None):
        if domain is None:
            domain = []

        if skill_name:
            domain.append(('skill_name', 'ilike', skill_name))
        if category_id:
            domain.append(('category_id', '=', category_id))
        if location:
            domain.append(('location', 'ilike', location))

        domain.append(('is_public', '=', True))
        return self.search(domain)