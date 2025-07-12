from odoo import models, fields, api

class SkillCategory(models.Model):
    _name = 'skill.category'
    _description = 'Skill Category'
    _order = 'name'

    name = fields.Char(string='Category Name', required=True)
    description = fields.Text(string='Description')
    color = fields.Char(string='Color', size=7, default='#FFFFFF')
    active = fields.Boolean(string='Active', default=True)
    skill_ids = fields.One2many('user.skill', 'category_id', string='Skills')
    skill_count = fields.Integer(string='Skills Count', compute='_compute_skill_count')

    @api.depends('skill_ids')
    def _compute_skill_count(self):
        for record in self:
            record.skill_count = len(record.skill_ids)

    def name_get(self):
        result = []
        for record in self:
            result.append((record.id, record.name))
        return result