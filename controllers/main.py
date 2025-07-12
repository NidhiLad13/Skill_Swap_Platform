from odoo import http
from odoo.http import request
import json


class SkillSwapController(http.Controller):

    @http.route('/skill_swap/api/skills/search', type='json', auth='user', methods=['POST'])
    def search_skills(self, **kwargs):
        """API endpoint to search skills"""
        domain = []

        if kwargs.get('skill_name'):
            domain.append(('skill_name', 'ilike', kwargs['skill_name']))
        if kwargs.get('category_id'):
            domain.append(('category_id', '=', kwargs['category_id']))
        if kwargs.get('location'):
            domain.append(('location', 'ilike', kwargs['location']))
        if kwargs.get('is_offered'):
            domain.append(('is_offered', '=', True))
        if kwargs.get('is_wanted'):
            domain.append(('is_wanted', '=', True))

        domain.append(('is_public', '=', True))
        domain.append(('user_id', '!=', request.env.user.id))

        skills = request.env['user.skill'].search(domain, limit=50)

        result = []
        for skill in skills:
            result.append({
                'id': skill.id,
                'skill_name': skill.skill_name,
                'user_name': skill.user_id.name,
                'user_id': skill.user_id.id,
                'category': skill.category_id.name,
                'skill_level': skill.skill_level,
                'location': skill.location,
                'availability': skill.availability,
                'description': skill.description,
                'is_offered': skill.is_offered,
                'is_wanted': skill.is_wanted
            })

        return {'skills': result}

    @http.route('/skill_swap/api/request/create', type='json', auth='user', methods=['POST'])
    def create_swap_request(self, **kwargs):
        """API endpoint to create swap request"""
        try:
            # Validate required fields
            required_fields = ['provider_skill_id', 'requester_skill_id']
            for field in required_fields:
                if not kwargs.get(field):
                    return {'error': f'Missing required field: {field}'}

            # Get skills
            provider_skill = request.env['user.skill'].browse(kwargs['provider_skill_id'])
            requester_skill = request.env['user.skill'].browse(kwargs['requester_skill_id'])

            if not provider_skill or not requester_skill:
                return {'error': 'Invalid skill IDs'}

            # Create swap request
            swap_request = request.env['swap.request'].create({
                'requester_id': request.env.user.id,
                'provider_id': provider_skill.user_id.id,
                'requester_skill_id': requester_skill.id,
                'provider_skill_id': provider_skill.id,
                'message': kwargs.get('message', ''),
                'meeting_type': kwargs.get('meeting_type', 'online'),
                'estimated_duration': kwargs.get('estimated_duration', 1.0),
            })

            # Send notification email
            template = request.env.ref('skill_swap_platform.email_template_swap_request')
            if template:
                template.send_mail(swap_request.id, force_send=True)

            return {'success': True, 'request_id': swap_request.id}

        except Exception as e:
            return {'error': str(e)}

    @http.route('/skill_swap/api/categories', type='json', auth='user', methods=['GET'])
    def get_categories(self):
        """Get all skill categories"""
        categories = request.env['skill.category'].search([('active', '=', True)])
        result = []
        for category in categories:
            result.append({
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'skill_count': category.skill_count
            })
        return {'categories': result}

    @http.route('/skill_swap/api/my_skills', type='json', auth='user', methods=['GET'])
    def get_my_skills(self):
        """Get current user's skills"""
        skills = request.env['user.skill'].search([('user_id', '=', request.env.user.id)])
        result = []
        for skill in skills:
            result.append({
                'id': skill.id,
                'skill_name': skill.skill_name,
                'category': skill.category_id.name,
                'skill_level': skill.skill_level,
                'is_offered': skill.is_offered,
                'is_wanted': skill.is_wanted,
                'availability': skill.availability,
                'location': skill.location,
                'is_public': skill.is_public
            })
        return {'skills': result}

    @http.route('/skill_swap/api/my_requests', type='json', auth='user', methods=['GET'])
    def get_my_requests(self):
        """Get current user's swap requests"""
        requests = request.env['swap.request'].search([
            '|', ('requester_id', '=', request.env.user.id),
            ('provider_id', '=', request.env.user.id)
        ])

        result = []
        for req in requests:
            result.append({
                'id': req.id,
                'name': req.name,
                'requester_name': req.requester_id.name,
                'provider_name': req.provider_id.name,
                'requester_skill': req.requester_skill_id.skill_name,
                'provider_skill': req.provider_skill_id.skill_name,
                'state': req.state,
                'requested_date': req.requested_date.isoformat() if req.requested_date else None,
                'message': req.message,
                'is_requester': req.requester_id.id == request.env.user.id
            })
        return {'requests': result}