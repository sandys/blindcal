import { Liquid } from 'liquidjs'

// Create a sandboxed Liquid engine with custom filters
export function createTemplateEngine(): Liquid {
  const engine = new Liquid({
    strictFilters: true,
    strictVariables: false,
    trimTagLeft: false,
    trimTagRight: false,
    trimOutputLeft: false,
    trimOutputRight: false,
  })

  // Custom filters for BlindCal

  // Format date
  engine.registerFilter('format_date', (date: string | Date, format?: string) => {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''

    const options: Intl.DateTimeFormatOptions = {}

    switch (format) {
      case 'short':
        options.month = 'short'
        options.day = 'numeric'
        break
      case 'long':
        options.weekday = 'long'
        options.year = 'numeric'
        options.month = 'long'
        options.day = 'numeric'
        break
      case 'relative':
        const now = new Date()
        const diff = d.getTime() - now.getTime()
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
        if (days === 0) return 'today'
        if (days === 1) return 'tomorrow'
        if (days === -1) return 'yesterday'
        if (days > 0) return `in ${days} days`
        return `${Math.abs(days)} days ago`
      default:
        options.year = 'numeric'
        options.month = 'long'
        options.day = 'numeric'
    }

    return d.toLocaleDateString('en-US', options)
  })

  // Get initials from name
  engine.registerFilter('initials', (name: string) => {
    if (!name) return ''
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  })

  // Truncate text
  engine.registerFilter('truncate_words', (text: string, count: number = 20) => {
    if (!text) return ''
    const words = text.split(/\s+/)
    if (words.length <= count) return text
    return words.slice(0, count).join(' ') + '...'
  })

  // Pluralize
  engine.registerFilter('pluralize', (count: number, singular: string, plural?: string) => {
    if (count === 1) return singular
    return plural || singular + 's'
  })

  // Mask email (show first char + domain)
  engine.registerFilter('mask_email', (email: string) => {
    if (!email || !email.includes('@')) return email
    const [local, domain] = email.split('@')
    return `${local.charAt(0)}***@${domain}`
  })

  // Age calculation
  engine.registerFilter('age', (birthdate: string | Date) => {
    if (!birthdate) return ''
    const birth = new Date(birthdate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  })

  // Safe HTML escape (already default, but explicit)
  engine.registerFilter('safe_text', (text: string) => {
    if (!text) return ''
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  })

  // Convert newlines to <br>
  engine.registerFilter('nl2br', (text: string) => {
    if (!text) return ''
    return text.replace(/\n/g, '<br>')
  })

  return engine
}

// Types for template context
export interface CampaignTemplateContext {
  campaign: {
    title: string
    tagline?: string
    description?: string
    slug: string
    is_accepting_applications: boolean
    requires_photo: boolean
    requires_bio: boolean
    custom_questions?: Array<{ question: string; required: boolean }>
    created_at: string
    published_at?: string
  }
  wingman: {
    display_name?: string
    bio?: string
    initials: string
  }
  single: {
    display_name?: string
    bio?: string
    age?: number
    initials: string
  }
  stats: {
    total_candidates: number
    active_candidates: number
  }
  config: {
    show_wingman_name: boolean
    show_single_bio: boolean
    primary_color?: string
    accent_color?: string
  }
}

// Render template safely
export async function renderTemplate(
  template: string,
  context: CampaignTemplateContext
): Promise<string> {
  const engine = createTemplateEngine()

  try {
    const result = await engine.parseAndRender(template, context)
    return result
  } catch (error) {
    console.error('Template rendering error:', error)
    // Return a safe fallback
    return `
      <div class="p-8 text-center">
        <h1 class="text-2xl font-bold">${context.campaign.title}</h1>
        ${context.campaign.tagline ? `<p class="text-lg text-gray-600 mt-2">${context.campaign.tagline}</p>` : ''}
        ${context.campaign.description ? `<p class="mt-4">${context.campaign.description}</p>` : ''}
      </div>
    `
  }
}

// Validate template syntax without rendering
export async function validateTemplate(template: string): Promise<{ valid: boolean; error?: string }> {
  const engine = createTemplateEngine()

  try {
    await engine.parse(template)
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid template syntax',
    }
  }
}
