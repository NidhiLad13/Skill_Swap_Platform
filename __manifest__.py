{
    'name': 'Skill Swap Platform',
    'version': '1.0.0',
    'category': 'Community',
    'summary': 'A platform for users to swap skills and knowledge',
    'description': """
        Skill Swap Platform allows users to:
        - List their skills and expertise
        - Request skills from other users
        - Manage swap requests and ratings
        - Browse and search users by skills
        - Admin controls for moderation
    """,
    'author': 'Nidhi Lad',
    'website': 'https://github.com/NidhiLad13/Skill_Swap_Platform',
    'depends': ['base', 'website', 'portal', 'mail'],
    'data': [
        'security/security.xml',
        'security/ir.model.access.csv',
        'data/skill_categories_data.xml',
        'data/email_templates.xml',
        'views/menu.xml',
        'views/skill_category_views.xml',
        'views/user_skill_views.xml',
        'views/swap_request_views.xml',
        'views/swap_rating_views.xml',
        'views/portal_templates.xml',
        'wizard/swap_request_wizard.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'skill_swap_platform/static/src/js/skill_category_form.js',
            'skill_swap_platform/static/src/css/skill_category_styles.css',
            'skill_swap_platform/static/src/js/skill_request.js',
        ],
        'web.assets_frontend': [
            'skill_swap_platform/static/src/js/skill_swap.js',
            'skill_swap_platform/static/src/css/skill_swap_styles.css',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
