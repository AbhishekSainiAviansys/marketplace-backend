/** Shop home: video hero, ads, deals, live class. Categories live on /shop. */
import { useNavigate } from 'react-router-dom'
import { useShop } from '../store/shop'
import '../home.css'
import { Hero } from '../components/home/Hero'
import { PromoGrid, Ticker } from '../components/home/Ads'
import { DealsRow } from '../components/home/Browse'
import { LiveSection, Quotes } from '../components/home/Live'
import { TrustStrip } from '../components/home/Trust'
import { BannerSlider } from '../components/home/Banners'
import { MovingRows } from '../components/home/MovingRows'
import { BoostRow, RandomRow } from '../components/home/Spotlight'
import { DirectorySection } from '../components/home/DirectorySection'
import { SchoolSection } from '../components/home/SchoolSection'
import { VendorSection } from '../components/home/Vendor'
import { Reveal } from '../components/home/Reveal'
import { useHomeConfig } from '../store/homeConfig'


export function Home() {
  const { student } = useShop()
  const cfg = useHomeConfig()
  const nav = useNavigate()

  const shopClass = () => {
    nav(student?.className ? `/shop?q=${encodeURIComponent(student.className)}` : '/shop')
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      {cfg.sections.hero && <Hero onShopClass={shopClass} />}
      {cfg.sections.banners && <BannerSlider />}
      {cfg.sections.marquee && <MovingRows />}
      {/* admin-managed spotlight rows (self-hide until configured) */}
      <BoostRow />
      {cfg.sections.trust && <TrustStrip />}
      {cfg.sections.ticker && <Ticker />}
      {cfg.sections.promos && <PromoGrid />}

      {cfg.sections.deals && <DealsRow />}
      <RandomRow />
      {cfg.sections.live && <LiveSection />}

      {cfg.sections.directory && <DirectorySection />}

      {cfg.sections.school && <SchoolSection />}

      {cfg.sections.vendor && <VendorSection />}

      {cfg.sections.quotes && (
        <>
          <Reveal>
            <div className="flex items-end justify-between gap-3 pt-2">
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.18em] text-[var(--text-subtle)] uppercase">{cfg.headings.quotesEyebrow}</p>
                <h2 className="st-display mt-1 text-2xl font-bold text-[var(--text)] sm:text-3xl">{cfg.headings.quotesTitle}</h2>
              </div>
            </div>
          </Reveal>
          <Quotes />
        </>
      )}
    </div>
  )
}




