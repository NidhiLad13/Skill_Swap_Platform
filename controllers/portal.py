from odoo import http, fields
from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal, pager as portal_pager
from odoo.exceptions import AccessError, MissingError
from collections import OrderedDict
from operator import itemgetter


class SkillSwapPortal(CustomerPortal):

    def _prepare_home_portal_values(self, counters):
        values = super()._prepare_home_portal_values(counters)
        if 'skill_request_count' in counters:
            values['skill_request_count'] = request.env['swap.request'].search_count([
                '|', ('requester_id', '=', request.env.user.id),
                ('provider_id', '=', request.env.user.id)
            ])
        return values

    @http.route(['/my/skills', '/my/skills/page/<int:page>'], type='http', auth="user", website=True)
    def portal_my_skills(self, page=1, date_begin=None, date_end=None, sortby=None, **kw):
        values = self._prepare_portal_layout_values()
        SkillSwap = request.env['user.skill']

        domain = [('user_id', '=', request.env.user.id)]

        searchbar_sortings = {
            'date': {'label': 'Newest', 'order': 'create_date desc'},
            'name': {'label': 'Name', 'order': 'skill_name'},
            'category': {'label': 'Category', 'order': 'category_id'},
        }

        if not sortby:
            sortby = 'date'
        order = searchbar_sortings[sortby]['order']

        # Count for pager
        skill_count = SkillSwap.search_count(domain)

        # Pager
        pager = portal_pager(
            url="/my/skills",
            url_args={'date_begin': date_begin, 'date_end': date_end, 'sortby': sortby},
            total=skill_count,
            page=page,
            step=self._items_per_page
        )

        # Content
        skills = SkillSwap.search(domain, order=order, limit=self._items_per_page, offset=pager['offset'])

        values.update({
            'date': date_begin,
            'date_end': date_end,
            'skills': skills,
            'page_name': 'skill',
            'archive_groups': [],
            'default_url': '/my/skills',
            'pager': pager,
            'searchbar_sortings': searchbar_sortings,
            'sortby': sortby
        })
        return request.render("skill_swap_platform.portal_my_skills", values)

    @http.route(['/my/skill_requests', '/my/skill_requests/page/<int:page>'], type='http', auth="user", website=True)
    def portal_my_skill_requests(self, page=1, date_begin=None, date_end=None, sortby=None, **kw):
        values = self._prepare_portal_layout_values()
        SwapRequest = request.env['swap.request']

        domain = ['|', ('requester_id', '=', request.env.user.id), ('provider_id', '=', request.env.user.id)]

        searchbar_sortings = {
            'date': {'label': 'Newest', 'order': 'create_date desc'},
            'name': {'label': 'Reference', 'order': 'name'},
            'state': {'label': 'Status', 'order': 'state'},
        }

        if not sortby:
            sortby = 'date'
        order = searchbar_sortings[sortby]['order']

        # Count for pager
        request_count = SwapRequest.search_count(domain)

        # Pager
        pager = portal_pager(
            url="/my/skill_requests",
            url_args={'date_begin': date_begin, 'date_end': date_end, 'sortby': sortby},
            total=request_count,
            page=page,
            step=self._items_per_page
        )

        # Content
        requests = SwapRequest.search(domain, order=order, limit=self._items_per_page, offset=pager['offset'])

        values.update({
            'date': date_begin,
            'date_end': date_end,
            'requests': requests,
            'page_name': 'skill_request',
            'archive_groups': [],
            'default_url': '/my/skill_requests',
            'pager': pager,
            'searchbar_sortings': searchbar_sortings,
            'sortby': sortby
        })
        return request.render("skill_swap_platform.portal_my_skill_requests", values)

    @http.route(['/my/skill_requests/<int:request_id>'], type='http', auth="user", website=True)
    def portal_skill_request_detail(self, request_id, access_token=None, **kw):
        try:
            request_sudo = self._document_check_access('swap.request', request_id, access_token)
        except (AccessError, MissingError):
            return request.redirect('/my')

        values = {
            'swap_request': request_sudo,
            'page_name': 'skill_request',
        }
        return request.render("skill_swap_platform.portal_skill_request_detail", values)

    @http.route('/skills/browse', type='http', auth="user", website=True)
    def browse_skills(self, **kw):
        """Browse public skills"""
        domain = [('is_public', '=', True), ('user_id', '!=', request.env.user.id)]

        # Apply filters
        if kw.get('category_id'):
            domain.append(('category_id', '=', int(kw['category_id'])))
        if kw.get('skill_name'):
            domain.append(('skill_name', 'ilike', kw['skill_name']))
        if kw.get('location'):
            domain.append(('location', 'ilike', kw['location']))
        if kw.get('is_offered'):
            domain.append(('is_offered', '=', True))
        if kw.get('is_wanted'):
            domain.append(('is_wanted', '=', True))

        skills = request.env['user.skill'].search(domain, limit=50)
        categories = request.env['skill.category'].search([('active', '=', True)])

        values = {
            'skills': skills,
            'categories': categories,
            'search_filters': kw,
            'page_name': 'browse_skills',
        }
        return request.render("skill_swap_platform.browse_skills", values)

    @http.route('/skill/<int:skill_id>', type='http', auth="user", website=True)
    def skill_detail(self, skill_id, **kw):
        """Skill detail page"""
        skill = request.env['user.skill'].browse(skill_id)
        if not skill.exists() or not skill.is_public:
            return request.redirect('/skills/browse')

        # Get user's offered skills for swap request
        my_skills = request.env['user.skill'].search([
            ('user_id', '=', request.env.user.id),
            ('is_offered', '=', True)
        ])

        values = {
            'skill': skill,
            'my_skills': my_skills,
            'page_name': 'skill_detail',
        }
        return request.render("skill_swap_platform.skill_detail", values)

    @http.route('/skill_request/create', type='http', auth="user", website=True, methods=['POST'])
    def create_skill_request(self, **kw):
        """Create a new skill swap request"""
        try:
            provider_skill = request.env['user.skill'].browse(int(kw['provider_skill_id']))
            requester_skill = request.env['user.skill'].browse(int(kw['requester_skill_id']))

            swap_request = request.env['swap.request'].create({
                'requester_id': request.env.user.id,
                'provider_id': provider_skill.user_id.id,
                'requester_skill_id': requester_skill.id,
                'provider_skill_id': provider_skill.id,
                'message': kw.get('message', ''),
                'meeting_type': kw.get('meeting_type', 'online'),
                'estimated_duration': float(kw.get('estimated_duration', 1.0)),
            })

            # Send notification email
            template = request.env.ref('skill_swap_platform.email_template_swap_request')
            if template:
                template.send_mail(swap_request.id, force_send=True)

            return request.redirect('/my/skill_requests')

        except Exception:
            return request.redirect('/skills/browse')