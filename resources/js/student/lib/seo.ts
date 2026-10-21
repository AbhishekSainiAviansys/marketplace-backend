/** Client-side SEO head manager for the student storefront.
 *
 * Call usePageSeo() at the top of any page component. It sets <title>,
 * <meta name="description">, canonical, Open Graph / Twitter tags and JSON-LD
 * from the page data you pass in, then cleans up on unmount so page switches
 * never leak tags between routes.
 */
import { useEffect } from 'react'
import { useBrand } from '../../lib/brand'

export type PageSeo = {
  title?: string
  description?: string
  canonical?: string
  type?: 'website' | 'product' | 'profile'
  image?: string          // og:image (absolute URL)
  brandName?: string      // overrides config('app.name')
  siteUrl?: string        // overrides config('app.url')
  product?: {
    sku?: string | null
    price?: number | null
    mrp?: number | null
    currency?: string
    condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition'
    availability?: 'InStock' | 'OutOfStock' | 'LimitedAvailability'
    brand?: string | null
    category?: string | null
  }
  institute?: {
    kind: 'school' | 'coaching'
    name: string
    code: string
    type?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    website?: string | null
    establishedYear?: string | null
    registrationNumber?: string | null
    board?: string | null
    studentStrength?: string | null
  }
}

export function usePageSeo(seo: PageSeo) {
  const { appName: brandAppName } = useBrand()
  const {
    title,
    description,
    canonical,
    type = 'website',
    image,
    brandName,
    siteUrl,
    product,
    institute,
  } = seo

  useEffect(() => {
    const host = (siteUrl || '').replace(/\/+$/, '')
    const siteName = brandName || brandAppName || 'Marketplace'
    const canonicalUrl = canonical || host || window.location.origin

    const tags: HTMLElement[] = []

    // <title>
    if (title) {
      const el = document.createElement('title')
      el.textContent = title
      document.head.appendChild(el)
      tags.push(el)
    }

    // <meta name="description">
    if (description) {
      const el = document.createElement('meta')
      el.name = 'description'
      el.content = description
      document.head.appendChild(el)
      tags.push(el)
    }

    // <link rel="canonical">
    if (canonicalUrl) {
      const el = document.createElement('link')
      el.rel = 'canonical'
      el.href = canonicalUrl
      document.head.appendChild(el)
      tags.push(el)
    }

    // Open Graph
    const og: [string, string][] = [
      ['og:type', type],
      ['og:site_name', siteName],
      ['og:url', canonicalUrl],
    ]
    if (title) og.push(['og:title', title])
    if (description) og.push(['og:description', description])
    if (image) og.push(['og:image', image])

    for (const [prop, content] of og) {
      const el = document.createElement('meta')
      el.setAttribute('property', prop)
      el.content = content
      document.head.appendChild(el)
      tags.push(el)
    }

    // Twitter
    const tw: [string, string][] = [
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', title ?? siteName],
      ['twitter:description', description ?? ''],
    ]
    if (image) tw.push(['twitter:image', image])
    for (const [name, content] of tw) {
      const el = document.createElement('meta')
      el.name = name
      el.content = content
      document.head.appendChild(el)
      tags.push(el)
    }

    // JSON-LD
    const jsonLd: Record<string, unknown>[] = []
    if (product && product.sku) {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: title,
        sku: product.sku,
        description,
        image: image ?? null,
        brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
        category: product.category ?? undefined,
        offers: {
          '@type': 'Offer',
          price: product.price ?? 0,
          priceCurrency: product.currency ?? 'INR',
          availability: `https://schema.org/${product.availability ?? 'InStock'}`,
          itemCondition: `https://schema.org/${product.condition ?? 'NewCondition'}`,
        } as Record<string, unknown>,
      })
    }
    if (institute) {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': institute.kind === 'school' ? 'EducationalOrganization' : 'LocalBusiness',
        name: institute.name,
        legalName: institute.name,
        additionalName: institute.code,
        address: institute.address ?? undefined,
        telephone: institute.phone ?? undefined,
        email: institute.email ?? undefined,
        url: institute.website ?? undefined,
        foundingDate: institute.establishedYear ?? undefined,
      } as Record<string, unknown>)
    }

    for (const ld of jsonLd) {
      const el = document.createElement('script')
      el.type = 'application/ld+json'
      el.textContent = JSON.stringify(ld)
      document.head.appendChild(el)
      tags.push(el)
    }

    return () => {
      tags.forEach((t) => t.remove())
    }
  }, [title, description, canonical, type, image, brandName, siteUrl, product, institute])
}
