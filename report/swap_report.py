from odoo import models, fields, api, tools

class SwapReport(models.Model):
    _name = 'swap.report'
    _description = 'Skill Swap Report'
    _auto = False
    _rec_name = 'id'

    # Request fields
    request_id = fields.Many2one('swap.request', string='Request')
    request_name = fields.Char(string='Request Reference')
    requester_id = fields.Many2one('res.users', string='Requester')
    provider_id = fields.Many2one('res.users', string='Provider')
    state = fields.Selection([
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ], string='Status')

    # Skill fields
    requester_skill_id = fields.Many2one('user.skill', string='Offered Skill')
    provider_skill_id = fields.Many2one('user.skill', string='Requested Skill')
    requester_skill_name = fields.Char(string='Offered Skill Name')
    provider_skill_name = fields.Char(string='Requested Skill Name')
    requester_skill_category = fields.Char(string='Offered Skill Category')
    provider_skill_category = fields.Char(string='Requested Skill Category')

    # Date fields
    requested_date = fields.Date(string='Requested Date')
    response_date = fields.Date(string='Response Date')
    completion_date = fields.Date(string='Completion Date')

    # Duration and type
    estimated_duration = fields.Float(string='Estimated Duration')
    meeting_type = fields.Selection([
        ('online', 'Online'),
        ('in_person', 'In Person'),
        ('both', 'Both')
    ], string='Meeting Type')

    # Aggregated fields
    rating = fields.Float(string='Average Rating')
    response_time_days = fields.Integer(string='Response Time (Days)')

    def init(self):
        tools.drop_view_if_exists(self.env.cr, self._table)
        self.env.cr.execute("""
            CREATE OR REPLACE VIEW %s AS (
                SELECT 
                    row_number() OVER () AS id,
                    sr.id as request_id,
                    sr.name as request_name,
                    sr.requester_id,
                    sr.provider_id,
                    sr.state,
                    sr.requester_skill_id,
                    sr.provider_skill_id,
                    rus.name as requester_skill_name,
                    pus.name as provider_skill_name,
                    rsc.name as requester_skill_category,
                    psc.name as provider_skill_category,
                    sr.requested_date,
                    sr.response_date,
                    sr.completion_date,
                    sr.estimated_duration,
                    sr.meeting_type,
                    COALESCE(avg_rating.rating, 0) as rating,
                    CASE 
                        WHEN sr.response_date IS NOT NULL AND sr.requested_date IS NOT NULL 
                        THEN (sr.response_date - sr.requested_date)
                        ELSE 0 
                    END as response_time_days
                FROM swap_request sr
                LEFT JOIN user_skill rus ON sr.requester_skill_id = rus.id
                LEFT JOIN user_skill pus ON sr.provider_skill_id = pus.id
                LEFT JOIN skill_category rsc ON rus.category_id = rsc.id
                LEFT JOIN skill_category psc ON pus.category_id = psc.id
                LEFT JOIN (
                    SELECT 
                        request_id,
                        AVG(rating) as rating
                    FROM swap_feedback
                    GROUP BY request_id
                ) avg_rating ON sr.id = avg_rating.request_id
            )
        """ % self._table)

    @api.model
    def get_swap_statistics(self):
        """Get general swap statistics"""
        self.env.cr.execute("""
            SELECT 
                COUNT(*) as total_swaps,
                COUNT(CASE WHEN state = 'completed' THEN 1 END) as completed_swaps,
                COUNT(CASE WHEN state = 'pending' THEN 1 END) as pending_swaps,
                COUNT(CASE WHEN state = 'accepted' THEN 1 END) as accepted_swaps,
                COUNT(CASE WHEN state = 'rejected' THEN 1 END) as rejected_swaps,
                COUNT(CASE WHEN state = 'cancelled' THEN 1 END) as cancelled_swaps,
                AVG(rating) as avg_rating,
                AVG(response_time_days) as avg_response_time
            FROM swap_report
        """)
        result = self.env.cr.dictfetchone()
        return result

    @api.model
    def get_top_skills(self, limit=10):
        """Get most popular skills"""
        self.env.cr.execute("""
            SELECT 
                skill_name,
                COUNT(*) as request_count
            FROM (
                SELECT requester_skill_name as skill_name FROM swap_report
                UNION ALL
                SELECT provider_skill_name as skill_name FROM swap_report
            ) skills
            WHERE skill_name IS NOT NULL
            GROUP BY skill_name
            ORDER BY request_count DESC
            LIMIT %s
        """, (limit,))
        return self.env.cr.dictfetchall()

    @api.model
    def get_user_activity(self, user_id):
        """Get activity stats for a specific user"""
        self.env.cr.execute("""
            SELECT 
                COUNT(CASE WHEN requester_id = %s THEN 1 END) as requests_made,
                COUNT(CASE WHEN provider_id = %s THEN 1 END) as requests_received,
                COUNT(CASE WHEN (requester_id = %s OR provider_id = %s) AND state = 'completed' THEN 1 END) as completed_swaps,
                AVG(CASE WHEN provider_id = %s THEN rating END) as avg_rating_received
            FROM swap_report
            WHERE requester_id = %s OR provider_id = %s
        """, (user_id, user_id, user_id, user_id, user_id, user_id, user_id))
        return self.env.cr.dictfetchone()

    @api.model
    def get_monthly_trends(self):
        """Get monthly swap trends"""
        self.env.cr.execute("""
            SELECT 
                DATE_TRUNC('month', requested_date) as month,
                COUNT(*) as total_requests,
                COUNT(CASE WHEN state = 'completed' THEN 1 END) as completed_count,
                AVG(rating) as avg_rating
            FROM swap_report
            WHERE requested_date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', requested_date)
            ORDER BY month
        """)
        return self.env.cr.dictfetchall()

    @api.model
    def export_report_data(self, filters=None):
        """Export report data with optional filters"""
        domain = []
        if filters:
            if filters.get('state'):
                domain.append(('state', '=', filters['state']))
            if filters.get('date_from'):
                domain.append(('requested_date', '>=', filters['date_from']))
            if filters.get('date_to'):
                domain.append(('requested_date', '<=', filters['date_to']))
            if filters.get('skill_category'):
                domain.append('|',
                              ('requester_skill_category', '=', filters['skill_category']),
                              ('provider_skill_category', '=', filters['skill_category']))

        records = self.search(domain)
        return records.read([
            'request_name', 'requester_id', 'provider_id', 'state',
            'requester_skill_name', 'provider_skill_name',
            'requested_date', 'completion_date', 'rating'
        ])