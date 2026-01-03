import { describe, it, expect } from 'vitest'
import {
  createTemplateEngine,
  renderTemplate,
  validateTemplate,
  type CampaignTemplateContext,
} from '@/lib/templates/engine'
import {
  DEFAULT_CAMPAIGN_TEMPLATE,
  MINIMAL_CAMPAIGN_TEMPLATE,
  DETAILED_CAMPAIGN_TEMPLATE,
  ELEGANT_CAMPAIGN_TEMPLATE,
  PLAYFUL_CAMPAIGN_TEMPLATE,
  getTemplate,
  getAllTemplates,
  TEMPLATE_METADATA,
  TEMPLATES,
} from '@/lib/templates/defaults'

describe('Template Engine', () => {
  describe('createTemplateEngine', () => {
    it('should create a Liquid engine instance', () => {
      const engine = createTemplateEngine()
      expect(engine).toBeDefined()
      expect(typeof engine.parseAndRender).toBe('function')
    })
  })

  describe('Custom filters', () => {
    const engine = createTemplateEngine()

    describe('format_date filter', () => {
      it('should format date with default format', async () => {
        const result = await engine.parseAndRender(
          '{{ date | format_date }}',
          { date: '2025-06-15T12:00:00Z' }
        )
        expect(result).toContain('June')
        expect(result).toContain('15')
        expect(result).toContain('2025')
      })

      it('should format date with short format', async () => {
        const result = await engine.parseAndRender(
          '{{ date | format_date: "short" }}',
          { date: '2025-06-15T12:00:00Z' }
        )
        expect(result).toContain('Jun')
        expect(result).toContain('15')
      })

      it('should format date with long format', async () => {
        const result = await engine.parseAndRender(
          '{{ date | format_date: "long" }}',
          { date: '2025-06-15T12:00:00Z' }
        )
        expect(result).toContain('Sunday')
        expect(result).toContain('June')
      })

      it('should handle empty date', async () => {
        const result = await engine.parseAndRender(
          '{{ date | format_date }}',
          { date: null }
        )
        expect(result).toBe('')
      })
    })

    describe('initials filter', () => {
      it('should get initials from full name', async () => {
        const result = await engine.parseAndRender(
          '{{ name | initials }}',
          { name: 'John Doe' }
        )
        expect(result).toBe('JD')
      })

      it('should limit to 2 characters', async () => {
        const result = await engine.parseAndRender(
          '{{ name | initials }}',
          { name: 'John Michael Doe' }
        )
        expect(result).toBe('JM')
      })

      it('should handle single name', async () => {
        const result = await engine.parseAndRender(
          '{{ name | initials }}',
          { name: 'John' }
        )
        expect(result).toBe('J')
      })

      it('should handle empty name', async () => {
        const result = await engine.parseAndRender(
          '{{ name | initials }}',
          { name: '' }
        )
        expect(result).toBe('')
      })
    })

    describe('truncate_words filter', () => {
      it('should truncate to specified word count', async () => {
        const result = await engine.parseAndRender(
          '{{ text | truncate_words: 3 }}',
          { text: 'one two three four five' }
        )
        expect(result).toBe('one two three...')
      })

      it('should not truncate if under limit', async () => {
        const result = await engine.parseAndRender(
          '{{ text | truncate_words: 10 }}',
          { text: 'short text' }
        )
        expect(result).toBe('short text')
      })

      it('should use default of 20 words', async () => {
        const text = Array(25).fill('word').join(' ')
        const result = await engine.parseAndRender(
          '{{ text | truncate_words }}',
          { text }
        )
        // "..." is appended to the last word, so count is still 20
        expect(result.split(' ').length).toBe(20)
        expect(result).toContain('...')
      })
    })

    describe('pluralize filter', () => {
      it('should return singular for count 1', async () => {
        const result = await engine.parseAndRender(
          '{{ count | pluralize: "person", "people" }}',
          { count: 1 }
        )
        expect(result).toBe('person')
      })

      it('should return plural for count > 1', async () => {
        const result = await engine.parseAndRender(
          '{{ count | pluralize: "person", "people" }}',
          { count: 5 }
        )
        expect(result).toBe('people')
      })

      it('should auto-pluralize with s if no plural provided', async () => {
        const result = await engine.parseAndRender(
          '{{ count | pluralize: "cat" }}',
          { count: 3 }
        )
        expect(result).toBe('cats')
      })
    })

    describe('mask_email filter', () => {
      it('should mask email address', async () => {
        const result = await engine.parseAndRender(
          '{{ email | mask_email }}',
          { email: 'john.doe@example.com' }
        )
        expect(result).toBe('j***@example.com')
      })

      it('should handle short local part', async () => {
        const result = await engine.parseAndRender(
          '{{ email | mask_email }}',
          { email: 'a@example.com' }
        )
        expect(result).toBe('a***@example.com')
      })
    })

    describe('age filter', () => {
      it('should calculate age from birthdate', async () => {
        const birthYear = new Date().getFullYear() - 25
        const result = await engine.parseAndRender(
          '{{ dob | age }}',
          { dob: `${birthYear}-01-01` }
        )
        expect(parseInt(result)).toBeGreaterThanOrEqual(24)
        expect(parseInt(result)).toBeLessThanOrEqual(25)
      })

      it('should handle empty birthdate', async () => {
        const result = await engine.parseAndRender(
          '{{ dob | age }}',
          { dob: null }
        )
        expect(result).toBe('')
      })
    })

    describe('nl2br filter', () => {
      it('should convert newlines to br tags', async () => {
        const result = await engine.parseAndRender(
          '{{ text | nl2br }}',
          { text: 'line1\nline2\nline3' }
        )
        expect(result).toBe('line1<br>line2<br>line3')
      })
    })
  })

  describe('renderTemplate', () => {
    const mockContext: CampaignTemplateContext = {
      campaign: {
        title: 'Test Campaign',
        tagline: 'A test tagline',
        description: 'This is a description',
        slug: 'test-campaign',
        is_accepting_applications: true,
        requires_photo: true,
        requires_bio: true,
        created_at: '2025-01-01T00:00:00Z',
        published_at: '2025-01-02T00:00:00Z',
      },
      wingman: {
        display_name: 'Jane Wingman',
        bio: 'I help people find love',
        initials: 'JW',
      },
      single: {
        display_name: 'John Single',
        bio: 'Looking for someone special',
        age: 28,
        initials: 'JS',
      },
      stats: {
        total_candidates: 10,
        active_candidates: 5,
      },
      config: {
        show_wingman_name: true,
        show_single_bio: true,
      },
    }

    it('should render simple template with variables', async () => {
      const template = '<h1>{{ campaign.title }}</h1>'
      const result = await renderTemplate(template, mockContext)
      expect(result).toBe('<h1>Test Campaign</h1>')
    })

    it('should render template with conditionals', async () => {
      const template = `
        {% if campaign.is_accepting_applications %}
          <button>Apply</button>
        {% else %}
          <p>Closed</p>
        {% endif %}
      `
      const result = await renderTemplate(template, mockContext)
      expect(result).toContain('<button>Apply</button>')
      expect(result).not.toContain('<p>Closed</p>')
    })

    it('should render template with filters', async () => {
      const template = '{{ wingman.display_name | initials }}'
      const result = await renderTemplate(template, mockContext)
      expect(result).toBe('JW')
    })

    it('should handle missing optional variables', async () => {
      const template = '{{ campaign.tagline | default: "No tagline" }}'
      const contextWithoutTagline = {
        ...mockContext,
        campaign: { ...mockContext.campaign, tagline: undefined },
      }
      const result = await renderTemplate(template, contextWithoutTagline)
      expect(result).toBe('No tagline')
    })

    it('should return fallback on error', async () => {
      const invalidTemplate = '{% invalid_tag %}'
      const result = await renderTemplate(invalidTemplate, mockContext)
      expect(result).toContain('Test Campaign')
    })
  })

  describe('validateTemplate', () => {
    it('should validate correct template', async () => {
      const result = await validateTemplate('{{ campaign.title }}')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should detect invalid template syntax', async () => {
      const result = await validateTemplate('{{ unclosed')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should validate template with conditionals', async () => {
      const template = '{% if true %}yes{% endif %}'
      const result = await validateTemplate(template)
      expect(result.valid).toBe(true)
    })

    it('should detect unclosed conditionals', async () => {
      const result = await validateTemplate('{% if true %}yes')
      expect(result.valid).toBe(false)
    })
  })
})

describe('Default Templates', () => {
  const mockContext: CampaignTemplateContext = {
    campaign: {
      title: 'Find Love Campaign',
      tagline: 'Your match awaits',
      description: 'Looking for that special someone',
      slug: 'find-love',
      is_accepting_applications: true,
      requires_photo: true,
      requires_bio: false,
      created_at: '2025-01-01T00:00:00Z',
      published_at: '2025-01-15T00:00:00Z',
    },
    wingman: {
      display_name: 'Sarah Helper',
      bio: 'Professional matchmaker',
      initials: 'SH',
    },
    single: {
      display_name: 'Alex Seeker',
      bio: 'Adventure lover',
      age: 30,
      initials: 'AS',
    },
    stats: {
      total_candidates: 25,
      active_candidates: 15,
    },
    config: {
      show_wingman_name: true,
      show_single_bio: true,
    },
  }

  describe('DEFAULT_CAMPAIGN_TEMPLATE', () => {
    it('should render campaign title', async () => {
      const result = await renderTemplate(DEFAULT_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Find Love Campaign')
    })

    it('should render tagline when present', async () => {
      const result = await renderTemplate(DEFAULT_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Your match awaits')
    })

    it('should show apply button when accepting applications', async () => {
      const result = await renderTemplate(DEFAULT_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Apply Now')
    })

    it('should show closed message when not accepting', async () => {
      const closedContext = {
        ...mockContext,
        campaign: { ...mockContext.campaign, is_accepting_applications: false },
      }
      const result = await renderTemplate(DEFAULT_CAMPAIGN_TEMPLATE, closedContext)
      expect(result).toContain('Applications Closed')
    })

    it('should show candidate stats', async () => {
      const result = await renderTemplate(DEFAULT_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('25')
      expect(result).toContain('people have')
    })

    it('should show wingman info when configured', async () => {
      const result = await renderTemplate(DEFAULT_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Sarah Helper')
      expect(result).toContain('SH')
    })
  })

  describe('MINIMAL_CAMPAIGN_TEMPLATE', () => {
    it('should render campaign title', async () => {
      const result = await renderTemplate(MINIMAL_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Find Love Campaign')
    })

    it('should be concise', async () => {
      const result = await renderTemplate(MINIMAL_CAMPAIGN_TEMPLATE, mockContext)
      // Should not contain detailed sections
      expect(result).not.toContain('About This Opportunity')
      expect(result).not.toContain('Meet the People')
    })

    it('should show apply button', async () => {
      const result = await renderTemplate(MINIMAL_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Apply')
    })
  })

  describe('DETAILED_CAMPAIGN_TEMPLATE', () => {
    it('should render hero section', async () => {
      const result = await renderTemplate(DETAILED_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Find Love Campaign')
      expect(result).toContain('Your match awaits')
    })

    it('should show wingman and single cards', async () => {
      const result = await renderTemplate(DETAILED_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Sarah Helper')
      expect(result).toContain('Alex Seeker')
      expect(result).toContain('Wingman')
    })

    it('should show requirements section', async () => {
      const result = await renderTemplate(DETAILED_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('photo')
    })

    it('should include CTA section', async () => {
      const result = await renderTemplate(DETAILED_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Ready to Take a Chance')
    })
  })

  describe('ELEGANT_CAMPAIGN_TEMPLATE', () => {
    it('should render with sophisticated styling', async () => {
      const result = await renderTemplate(ELEGANT_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Find Love Campaign')
      expect(result).toContain('An Invitation')
    })

    it('should show matchmaker label for wingman', async () => {
      const result = await renderTemplate(ELEGANT_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('The Matchmaker')
      expect(result).toContain('Sarah Helper')
    })

    it('should show elegant CTA when accepting applications', async () => {
      const result = await renderTemplate(ELEGANT_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Express Your Interest')
      expect(result).toContain('Begin Application')
    })

    it('should show closed message when not accepting', async () => {
      const closedContext = {
        ...mockContext,
        campaign: { ...mockContext.campaign, is_accepting_applications: false },
      }
      const result = await renderTemplate(ELEGANT_CAMPAIGN_TEMPLATE, closedContext)
      expect(result).toContain('Applications are currently closed')
    })

    it('should show stats with elegant formatting', async () => {
      const result = await renderTemplate(ELEGANT_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('25')
      expect(result).toContain('expressions of interest')
    })
  })

  describe('PLAYFUL_CAMPAIGN_TEMPLATE', () => {
    it('should render with playful styling', async () => {
      const result = await renderTemplate(PLAYFUL_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Find Love Campaign')
      expect(result).toContain('New Adventure Awaits')
    })

    it('should show fun CTA button', async () => {
      const result = await renderTemplate(PLAYFUL_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Join the Fun')
    })

    it('should show description section with icon', async () => {
      const result = await renderTemplate(PLAYFUL_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain("What's This About?")
    })

    it('should show wingman with playful label', async () => {
      const result = await renderTemplate(PLAYFUL_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Your Wingman')
      expect(result).toContain('Sarah Helper')
    })

    it('should show stats with fun messaging', async () => {
      const result = await renderTemplate(PLAYFUL_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('25')
      expect(result).toContain('already applied')
    })

    it('should show final CTA with excitement', async () => {
      const result = await renderTemplate(PLAYFUL_CAMPAIGN_TEMPLATE, mockContext)
      expect(result).toContain('Ready to Say Hello?')
      expect(result).toContain("Let's Do This")
    })

    it('should show closed message when not accepting', async () => {
      const closedContext = {
        ...mockContext,
        campaign: { ...mockContext.campaign, is_accepting_applications: false },
      }
      const result = await renderTemplate(PLAYFUL_CAMPAIGN_TEMPLATE, closedContext)
      expect(result).toContain('Applications are closed for now')
    })
  })

  describe('getTemplate', () => {
    it('should return default template', () => {
      const template = getTemplate('default')
      expect(template).toBe(DEFAULT_CAMPAIGN_TEMPLATE)
    })

    it('should return minimal template', () => {
      const template = getTemplate('minimal')
      expect(template).toBe(MINIMAL_CAMPAIGN_TEMPLATE)
    })

    it('should return detailed template', () => {
      const template = getTemplate('detailed')
      expect(template).toBe(DETAILED_CAMPAIGN_TEMPLATE)
    })

    it('should return elegant template', () => {
      const template = getTemplate('elegant')
      expect(template).toBe(ELEGANT_CAMPAIGN_TEMPLATE)
    })

    it('should return playful template', () => {
      const template = getTemplate('playful')
      expect(template).toBe(PLAYFUL_CAMPAIGN_TEMPLATE)
    })
  })

  describe('getAllTemplates', () => {
    it('should return all 5 templates', () => {
      const templates = getAllTemplates()
      expect(templates).toHaveLength(5)
    })

    it('should include id, template, name, and description for each', () => {
      const templates = getAllTemplates()
      templates.forEach((t) => {
        expect(t).toHaveProperty('id')
        expect(t).toHaveProperty('template')
        expect(t).toHaveProperty('name')
        expect(t).toHaveProperty('description')
        expect(typeof t.template).toBe('string')
        expect(t.template.length).toBeGreaterThan(100)
      })
    })

    it('should have correct template IDs', () => {
      const templates = getAllTemplates()
      const ids = templates.map((t) => t.id)
      expect(ids).toContain('default')
      expect(ids).toContain('minimal')
      expect(ids).toContain('detailed')
      expect(ids).toContain('elegant')
      expect(ids).toContain('playful')
    })
  })

  describe('TEMPLATE_METADATA', () => {
    it('should have metadata for all templates', () => {
      const templateKeys = Object.keys(TEMPLATES)
      const metadataKeys = Object.keys(TEMPLATE_METADATA)
      expect(metadataKeys).toEqual(templateKeys)
    })

    it('should have name and description for each template', () => {
      Object.values(TEMPLATE_METADATA).forEach((meta) => {
        expect(meta.name).toBeDefined()
        expect(meta.description).toBeDefined()
        expect(meta.name.length).toBeGreaterThan(0)
        expect(meta.description.length).toBeGreaterThan(10)
      })
    })
  })

  describe('All templates should be valid Liquid syntax', () => {
    const templateEntries = Object.entries(TEMPLATES) as [string, string][]

    templateEntries.forEach(([name, template]) => {
      it(`${name} template should have valid syntax`, async () => {
        const result = await validateTemplate(template)
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })
  })

  describe('All templates should render without errors', () => {
    const templateEntries = Object.entries(TEMPLATES) as [string, string][]

    templateEntries.forEach(([name, template]) => {
      it(`${name} template should render successfully`, async () => {
        const result = await renderTemplate(template, mockContext)
        expect(result).toContain('Find Love Campaign')
        expect(result.length).toBeGreaterThan(100)
      })
    })
  })
})
