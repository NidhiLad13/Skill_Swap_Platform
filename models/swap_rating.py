from odoo import models, fields, api, exceptions


class SwapRating(models.Model):
    _name = 'swap.rating'
    _description = 'Swap Rating and Feedback'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'created_date desc'

    name = fields.Char(string="Title", compute="_compute_name", store=True)

    swap_request_id = fields.Many2one('swap.request', string='Swap Request', required=True, ondelete='cascade')
    rater_id = fields.Many2one('res.users', string='Rater', required=True, ondelete='cascade')
    rated_user_id = fields.Many2one('res.users', string='Rated User', required=True, ondelete='cascade')

    rating = fields.Selection([
        ('1', '1 - Poor'),
        ('2', '2 - Fair'),
        ('3', '3 - Good'),
        ('4', '4 - Very Good'),
        ('5', '5 - Excellent')
    ], string='Rating', required=True)

    comment = fields.Text(string="Comment")
    feedback = fields.Text(string='Feedback')
    is_public = fields.Boolean(string='Public Feedback', default=True)
    created_date = fields.Datetime(string='Created Date', default=fields.Datetime.now)
    state = fields.Selection([
        ('draft', 'Draft'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ], string='Status', default='draft', tracking=True)

    rating_value = fields.Integer(string='Rating Value', compute='_compute_rating_value', store=True)
    helpful_count = fields.Integer(string='Helpful Votes', default=0)

    @api.depends('rating')
    def _compute_rating_value(self):
        for record in self:
            record.rating_value = int(record.rating) if record.rating else 0

    @api.depends('rater_id', 'rated_user_id')
    def _compute_name(self):
        for rec in self:
            if rec.rater_id and rec.rated_user_id:
                rec.name = f"Rating by {rec.rater_id.name} for {rec.rated_user_id.name}"
            else:
                rec.name = "Rating"

    @api.constrains('rater_id', 'rated_user_id')
    def _check_different_users(self):
        for record in self:
            if record.rater_id == record.rated_user_id:
                raise exceptions.ValidationError("You cannot rate yourself!")

    def action_approve(self):
        for rec in self:
            rec.state = 'approved'

    def action_reject(self):
        for rec in self:
            rec.state = 'rejected'
