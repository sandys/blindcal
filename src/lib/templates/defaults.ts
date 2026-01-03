// Default Liquid templates for campaign landing pages

export const DEFAULT_CAMPAIGN_TEMPLATE = `
<div class="min-h-screen bg-gradient-to-b from-gray-50 to-white">
  <!-- Header -->
  <header class="bg-white shadow-sm">
    <div class="max-w-4xl mx-auto px-4 py-6">
      <h1 class="text-3xl font-bold text-gray-900">{{ campaign.title }}</h1>
      {% if campaign.tagline %}
        <p class="mt-2 text-xl text-gray-600">{{ campaign.tagline }}</p>
      {% endif %}
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-4 py-8">
    <!-- Campaign Description -->
    {% if campaign.description %}
      <section class="mb-8">
        <div class="prose prose-lg max-w-none">
          {{ campaign.description | nl2br }}
        </div>
      </section>
    {% endif %}

    <!-- About Section -->
    <section class="mb-8 grid md:grid-cols-2 gap-6">
      {% if config.show_wingman_name %}
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
              {{ wingman.initials }}
            </div>
            <div>
              <p class="text-sm text-gray-500">Your Wingman</p>
              <p class="font-semibold">{{ wingman.display_name | default: "Anonymous Wingman" }}</p>
            </div>
          </div>
          {% if wingman.bio %}
            <p class="text-gray-600 text-sm">{{ wingman.bio | truncate_words: 30 }}</p>
          {% endif %}
        </div>
      {% endif %}

      {% if config.show_single_bio %}
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-semibold">
              {{ single.initials }}
            </div>
            <div>
              <p class="text-sm text-gray-500">Looking for a match</p>
              <p class="font-semibold">
                {{ single.display_name | default: "Someone Special" }}
                {% if single.age %}, {{ single.age }}{% endif %}
              </p>
            </div>
          </div>
          {% if single.bio %}
            <p class="text-gray-600 text-sm">{{ single.bio | truncate_words: 50 }}</p>
          {% endif %}
        </div>
      {% endif %}
    </section>

    <!-- Stats -->
    {% if stats.total_candidates > 0 %}
      <section class="mb-8 text-center py-4 bg-gray-50 rounded-lg">
        <p class="text-gray-600">
          <span class="font-semibold text-gray-900">{{ stats.total_candidates }}</span>
          {{ stats.total_candidates | pluralize: "person has", "people have" }} already applied
        </p>
      </section>
    {% endif %}

    <!-- Application CTA -->
    {% if campaign.is_accepting_applications %}
      <section class="bg-white rounded-lg shadow p-8 text-center">
        <h2 class="text-2xl font-bold mb-4">Interested?</h2>
        <p class="text-gray-600 mb-6">
          Submit your application and {{ wingman.display_name | default: "the wingman" }} will review it.
        </p>
        <a
          href="#apply"
          class="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Apply Now
        </a>

        {% if campaign.requires_photo or campaign.requires_bio %}
          <p class="mt-4 text-sm text-gray-500">
            {% if campaign.requires_photo and campaign.requires_bio %}
              A photo and bio are required
            {% elsif campaign.requires_photo %}
              A photo is required
            {% elsif campaign.requires_bio %}
              A bio is required
            {% endif %}
          </p>
        {% endif %}
      </section>
    {% else %}
      <section class="bg-gray-100 rounded-lg p-8 text-center">
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Applications Closed</h2>
        <p class="text-gray-600">This campaign is no longer accepting applications.</p>
      </section>
    {% endif %}
  </main>

  <!-- Footer -->
  <footer class="mt-12 py-6 border-t text-center text-gray-500 text-sm">
    <p>Published {{ campaign.published_at | format_date: "long" | default: "recently" }}</p>
  </footer>
</div>
`

export const MINIMAL_CAMPAIGN_TEMPLATE = `
<div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
  <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
    <h1 class="text-2xl font-bold mb-2">{{ campaign.title }}</h1>
    {% if campaign.tagline %}
      <p class="text-gray-600 mb-6">{{ campaign.tagline }}</p>
    {% endif %}

    {% if campaign.is_accepting_applications %}
      <a
        href="#apply"
        class="block w-full py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
      >
        Apply
      </a>
    {% else %}
      <p class="text-gray-500">Applications are closed</p>
    {% endif %}
  </div>
</div>
`

export const DETAILED_CAMPAIGN_TEMPLATE = `
<div class="min-h-screen bg-white">
  <!-- Hero Section -->
  <section class="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h1 class="text-4xl md:text-5xl font-bold mb-4">{{ campaign.title }}</h1>
      {% if campaign.tagline %}
        <p class="text-xl md:text-2xl opacity-90">{{ campaign.tagline }}</p>
      {% endif %}

      {% if campaign.is_accepting_applications %}
        <a
          href="#apply"
          class="inline-block mt-8 px-8 py-4 bg-white text-purple-600 font-bold rounded-full hover:bg-gray-100 transition-colors"
        >
          Apply Now
        </a>
      {% endif %}
    </div>
  </section>

  <main class="max-w-4xl mx-auto px-4 py-12">
    <!-- Description -->
    {% if campaign.description %}
      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-4">About This Opportunity</h2>
        <div class="prose prose-lg max-w-none text-gray-700">
          {{ campaign.description | nl2br }}
        </div>
      </section>
    {% endif %}

    <!-- The People -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-6">Meet the People</h2>

      <div class="grid md:grid-cols-2 gap-8">
        <!-- Wingman Card -->
        <div class="border rounded-xl p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
              {{ wingman.initials }}
            </div>
            <div>
              <span class="text-xs uppercase tracking-wider text-blue-600 font-semibold">Wingman</span>
              <h3 class="text-xl font-semibold">{{ wingman.display_name | default: "Your Guide" }}</h3>
            </div>
          </div>
          {% if wingman.bio %}
            <p class="text-gray-600">{{ wingman.bio }}</p>
          {% else %}
            <p class="text-gray-500 italic">Helping find the perfect match</p>
          {% endif %}
        </div>

        <!-- Single Card -->
        {% if config.show_single_bio %}
          <div class="border rounded-xl p-6">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center text-white text-xl font-bold">
                {{ single.initials }}
              </div>
              <div>
                <span class="text-xs uppercase tracking-wider text-pink-600 font-semibold">Looking for Love</span>
                <h3 class="text-xl font-semibold">
                  {{ single.display_name | default: "Mystery Match" }}
                  {% if single.age %}<span class="text-gray-500">, {{ single.age }}</span>{% endif %}
                </h3>
              </div>
            </div>
            {% if single.bio %}
              <p class="text-gray-600">{{ single.bio }}</p>
            {% endif %}
          </div>
        {% endif %}
      </div>
    </section>

    <!-- Requirements -->
    {% if campaign.requires_photo or campaign.requires_bio or campaign.custom_questions.size > 0 %}
      <section class="mb-12 bg-gray-50 rounded-xl p-6">
        <h2 class="text-xl font-bold mb-4">What We're Looking For</h2>
        <ul class="space-y-2">
          {% if campaign.requires_photo %}
            <li class="flex items-center gap-2">
              <span class="text-green-500">✓</span>
              <span>A recent photo of yourself</span>
            </li>
          {% endif %}
          {% if campaign.requires_bio %}
            <li class="flex items-center gap-2">
              <span class="text-green-500">✓</span>
              <span>A short bio about who you are</span>
            </li>
          {% endif %}
          {% for question in campaign.custom_questions %}
            <li class="flex items-center gap-2">
              <span class="text-green-500">✓</span>
              <span>{{ question.question }}{% if question.required %} (required){% endif %}</span>
            </li>
          {% endfor %}
        </ul>
      </section>
    {% endif %}

    <!-- Social Proof -->
    {% if stats.total_candidates > 0 %}
      <section class="text-center py-8 mb-12 border-y">
        <p class="text-3xl font-bold text-gray-900">{{ stats.total_candidates }}</p>
        <p class="text-gray-600">{{ stats.total_candidates | pluralize: "application", "applications" }} received</p>
      </section>
    {% endif %}

    <!-- Final CTA -->
    {% if campaign.is_accepting_applications %}
      <section id="apply" class="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 text-center text-white">
        <h2 class="text-2xl font-bold mb-2">Ready to Take a Chance?</h2>
        <p class="opacity-90 mb-6">Your next great story could start right here.</p>
        <button
          type="button"
          onclick="document.getElementById('application-form').scrollIntoView({behavior: 'smooth'})"
          class="px-8 py-4 bg-white text-purple-600 font-bold rounded-full hover:bg-gray-100 transition-colors"
        >
          Start Your Application
        </button>
      </section>
    {% endif %}
  </main>

  <footer class="py-8 text-center text-gray-400 text-sm border-t">
    <p>Campaign created {{ campaign.created_at | format_date: "relative" }}</p>
  </footer>
</div>
`

export const ELEGANT_CAMPAIGN_TEMPLATE = `
<div class="min-h-screen bg-stone-50">
  <!-- Elegant Header -->
  <header class="bg-white border-b border-stone-200">
    <div class="max-w-3xl mx-auto px-6 py-12 text-center">
      <p class="text-stone-400 uppercase tracking-[0.3em] text-xs mb-4">An Invitation</p>
      <h1 class="text-4xl md:text-5xl font-light text-stone-800 tracking-tight">{{ campaign.title }}</h1>
      {% if campaign.tagline %}
        <p class="mt-4 text-lg text-stone-500 italic font-light">{{ campaign.tagline }}</p>
      {% endif %}
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-6 py-16">
    <!-- Description -->
    {% if campaign.description %}
      <section class="mb-16">
        <div class="prose prose-stone prose-lg max-w-none text-stone-600 leading-relaxed">
          {{ campaign.description | nl2br }}
        </div>
      </section>
    {% endif %}

    <!-- The Principals -->
    <section class="mb-16">
      <div class="grid md:grid-cols-2 gap-12">
        {% if config.show_wingman_name %}
          <div class="text-center">
            <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-stone-100 border-2 border-stone-200 flex items-center justify-center">
              <span class="text-2xl font-light text-stone-600">{{ wingman.initials }}</span>
            </div>
            <p class="text-xs uppercase tracking-[0.2em] text-stone-400 mb-1">The Matchmaker</p>
            <h3 class="text-xl font-light text-stone-800">{{ wingman.display_name | default: "Your Guide" }}</h3>
            {% if wingman.bio %}
              <p class="mt-3 text-stone-500 text-sm leading-relaxed">{{ wingman.bio | truncate_words: 25 }}</p>
            {% endif %}
          </div>
        {% endif %}

        {% if config.show_single_bio %}
          <div class="text-center">
            <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-rose-50 border-2 border-rose-100 flex items-center justify-center">
              <span class="text-2xl font-light text-rose-400">{{ single.initials }}</span>
            </div>
            <p class="text-xs uppercase tracking-[0.2em] text-stone-400 mb-1">Seeking Connection</p>
            <h3 class="text-xl font-light text-stone-800">
              {{ single.display_name | default: "A Special Someone" }}
              {% if single.age %}<span class="text-stone-400">, {{ single.age }}</span>{% endif %}
            </h3>
            {% if single.bio %}
              <p class="mt-3 text-stone-500 text-sm leading-relaxed">{{ single.bio | truncate_words: 25 }}</p>
            {% endif %}
          </div>
        {% endif %}
      </div>
    </section>

    <!-- Divider -->
    <div class="flex items-center justify-center mb-16">
      <div class="w-16 h-px bg-stone-300"></div>
      <div class="w-2 h-2 mx-4 rotate-45 border border-stone-300"></div>
      <div class="w-16 h-px bg-stone-300"></div>
    </div>

    <!-- Stats -->
    {% if stats.total_candidates > 0 %}
      <section class="text-center mb-16">
        <p class="text-4xl font-light text-stone-700">{{ stats.total_candidates }}</p>
        <p class="text-stone-400 text-sm mt-1">{{ stats.total_candidates | pluralize: "expression of interest", "expressions of interest" }}</p>
      </section>
    {% endif %}

    <!-- CTA -->
    {% if campaign.is_accepting_applications %}
      <section class="text-center py-12 border-t border-b border-stone-200">
        <h2 class="text-2xl font-light text-stone-800 mb-3">Express Your Interest</h2>
        <p class="text-stone-500 mb-8 max-w-md mx-auto">
          Take the first step toward a meaningful connection.
        </p>
        <a
          href="#application-form"
          class="inline-block px-10 py-4 bg-stone-800 text-white text-sm uppercase tracking-[0.15em] hover:bg-stone-700 transition-colors"
        >
          Begin Application
        </a>
        {% if campaign.requires_photo or campaign.requires_bio %}
          <p class="mt-6 text-xs text-stone-400">
            {% if campaign.requires_photo and campaign.requires_bio %}
              Photo and personal statement required
            {% elsif campaign.requires_photo %}
              Photo required
            {% elsif campaign.requires_bio %}
              Personal statement required
            {% endif %}
          </p>
        {% endif %}
      </section>
    {% else %}
      <section class="text-center py-12 border-t border-b border-stone-200">
        <p class="text-stone-500 italic">Applications are currently closed</p>
      </section>
    {% endif %}
  </main>

  <footer class="py-8 text-center">
    <p class="text-xs text-stone-400 tracking-wide">
      Published {{ campaign.published_at | format_date: "long" | default: "recently" }}
    </p>
  </footer>
</div>
`

export const PLAYFUL_CAMPAIGN_TEMPLATE = `
<div class="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-violet-50">
  <!-- Fun Header -->
  <header class="relative overflow-hidden">
    <div class="absolute inset-0 opacity-10">
      <div class="absolute top-10 left-10 w-20 h-20 bg-amber-400 rounded-full blur-2xl"></div>
      <div class="absolute top-20 right-20 w-32 h-32 bg-rose-400 rounded-full blur-3xl"></div>
      <div class="absolute bottom-10 left-1/3 w-24 h-24 bg-violet-400 rounded-full blur-2xl"></div>
    </div>
    <div class="relative max-w-4xl mx-auto px-4 py-16 text-center">
      <div class="inline-block px-4 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-6">
        New Adventure Awaits
      </div>
      <h1 class="text-4xl md:text-6xl font-bold bg-gradient-to-r from-rose-500 via-violet-500 to-amber-500 bg-clip-text text-transparent">
        {{ campaign.title }}
      </h1>
      {% if campaign.tagline %}
        <p class="mt-4 text-xl text-gray-600">{{ campaign.tagline }}</p>
      {% endif %}

      {% if campaign.is_accepting_applications %}
        <a
          href="#application-form"
          class="inline-flex items-center gap-2 mt-8 px-8 py-4 bg-gradient-to-r from-rose-500 to-violet-500 text-white font-bold rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-rose-200"
        >
          <span>Join the Fun</span>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
          </svg>
        </a>
      {% endif %}
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-4 py-12">
    <!-- Description Card -->
    {% if campaign.description %}
      <section class="mb-12">
        <div class="bg-white rounded-3xl shadow-xl shadow-gray-100 p-8 md:p-12">
          <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span class="text-2xl">&#x1F4AC;</span> What's This About?
          </h2>
          <div class="text-gray-600 text-lg leading-relaxed">
            {{ campaign.description | nl2br }}
          </div>
        </div>
      </section>
    {% endif %}

    <!-- People Cards -->
    <section class="mb-12 grid md:grid-cols-2 gap-6">
      {% if config.show_wingman_name %}
        <div class="bg-white rounded-3xl shadow-xl shadow-gray-100 p-8 hover:scale-105 transition-transform">
          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-200">
              {{ wingman.initials }}
            </div>
            <div class="flex-1">
              <span class="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold mb-2">
                Your Wingman
              </span>
              <h3 class="text-xl font-bold text-gray-800">{{ wingman.display_name | default: "Mystery Helper" }}</h3>
              {% if wingman.bio %}
                <p class="mt-2 text-gray-500">{{ wingman.bio | truncate_words: 20 }}</p>
              {% endif %}
            </div>
          </div>
        </div>
      {% endif %}

      {% if config.show_single_bio %}
        <div class="bg-white rounded-3xl shadow-xl shadow-gray-100 p-8 hover:scale-105 transition-transform">
          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-rose-200">
              {{ single.initials }}
            </div>
            <div class="flex-1">
              <span class="inline-block px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold mb-2">
                Looking for You
              </span>
              <h3 class="text-xl font-bold text-gray-800">
                {{ single.display_name | default: "Someone Special" }}
                {% if single.age %}<span class="text-gray-400 font-normal">, {{ single.age }}</span>{% endif %}
              </h3>
              {% if single.bio %}
                <p class="mt-2 text-gray-500">{{ single.bio | truncate_words: 20 }}</p>
              {% endif %}
            </div>
          </div>
        </div>
      {% endif %}
    </section>

    <!-- Stats Banner -->
    {% if stats.total_candidates > 0 %}
      <section class="mb-12">
        <div class="bg-gradient-to-r from-violet-500 to-rose-500 rounded-3xl p-8 text-center text-white">
          <p class="text-5xl font-bold">{{ stats.total_candidates }}</p>
          <p class="text-white/80 mt-1">
            awesome {{ stats.total_candidates | pluralize: "person has", "people have" }} already applied!
          </p>
        </div>
      </section>
    {% endif %}

    <!-- Requirements -->
    {% if campaign.requires_photo or campaign.requires_bio %}
      <section class="mb-12">
        <div class="bg-amber-50 border-2 border-amber-200 rounded-3xl p-8">
          <h2 class="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
            <span>&#x1F4CB;</span> Quick Checklist
          </h2>
          <ul class="space-y-3">
            {% if campaign.requires_photo %}
              <li class="flex items-center gap-3 text-amber-700">
                <span class="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-sm">&#x1F4F8;</span>
                <span>Share a recent photo of yourself</span>
              </li>
            {% endif %}
            {% if campaign.requires_bio %}
              <li class="flex items-center gap-3 text-amber-700">
                <span class="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-sm">&#x270D;&#xFE0F;</span>
                <span>Write a little about yourself</span>
              </li>
            {% endif %}
          </ul>
        </div>
      </section>
    {% endif %}

    <!-- Final CTA -->
    {% if campaign.is_accepting_applications %}
      <section class="text-center py-8">
        <h2 class="text-3xl font-bold text-gray-800 mb-3">Ready to Say Hello?</h2>
        <p class="text-gray-500 mb-8 max-w-md mx-auto">
          Great connections start with a single step. Take yours now!
        </p>
        <a
          href="#application-form"
          class="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 text-white font-bold text-lg rounded-full hover:opacity-90 transition-opacity shadow-xl"
        >
          <span>Let's Do This</span>
          <span>&#x1F389;</span>
        </a>
      </section>
    {% else %}
      <section class="text-center py-12">
        <div class="inline-block px-8 py-4 bg-gray-100 rounded-full text-gray-500">
          Applications are closed for now - check back soon!
        </div>
      </section>
    {% endif %}
  </main>

  <footer class="py-8 text-center text-gray-400 text-sm">
    <p>Started {{ campaign.created_at | format_date: "relative" }}</p>
  </footer>
</div>
`

// Template registry
export const TEMPLATES = {
  default: DEFAULT_CAMPAIGN_TEMPLATE,
  minimal: MINIMAL_CAMPAIGN_TEMPLATE,
  detailed: DETAILED_CAMPAIGN_TEMPLATE,
  elegant: ELEGANT_CAMPAIGN_TEMPLATE,
  playful: PLAYFUL_CAMPAIGN_TEMPLATE,
} as const

export type TemplateName = keyof typeof TEMPLATES

// Template metadata for UI display
export const TEMPLATE_METADATA: Record<TemplateName, { name: string; description: string }> = {
  default: {
    name: 'Classic',
    description: 'A balanced layout with header, description, people cards, and call-to-action',
  },
  minimal: {
    name: 'Minimal',
    description: 'Simple centered card design - perfect for quick campaigns',
  },
  detailed: {
    name: 'Detailed',
    description: 'Rich layout with gradient hero, detailed people cards, and requirements section',
  },
  elegant: {
    name: 'Elegant',
    description: 'Sophisticated design with clean lines and refined typography',
  },
  playful: {
    name: 'Playful',
    description: 'Fun and vibrant design with colorful gradients and animations',
  },
}

export function getTemplate(name: TemplateName): string {
  return TEMPLATES[name] || TEMPLATES.default
}

export function getAllTemplates(): Array<{ id: TemplateName; template: string } & typeof TEMPLATE_METADATA[TemplateName]> {
  return (Object.keys(TEMPLATES) as TemplateName[]).map((id) => ({
    id,
    template: TEMPLATES[id],
    ...TEMPLATE_METADATA[id],
  }))
}
