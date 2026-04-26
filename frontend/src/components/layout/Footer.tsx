import { Link } from 'react-router-dom'
import { Facebook, Instagram, Youtube, Linkedin, Twitter } from 'lucide-react'

const footerLinks = {
  'Delivery Locations': ['Sporting', 'Ibrahimiya', 'Camp Caesar', 'El-Shatby'],
  'Learn':              ['Our Story', 'Food Safety', 'Help Center', 'Global Cuisines'],
  'Resources':          ['Gift Cards', 'Careers', 'Become a chef', 'Homemade food delivery'],
}

export default function Footer() {
  return (
    <footer className="bg-forest text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

        {/* Logo */}
        <div className="mb-8">
          <span className="font-display font-bold text-3xl tracking-tight">
            T<span className="inline-block -mx-0.5">🍽</span>'AM BEIT
          </span>
        </div>

        <div className="border-t border-white/20 pt-10 grid grid-cols-2 md:grid-cols-4 gap-10">

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="font-semibold text-white mb-4 text-base">{heading}</h4>
              <ul className="space-y-2">
                {links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-white/70 hover:text-white text-sm transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* App badges + social */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-base">Try our app</h4>
            <div className="flex flex-col gap-3 mb-8">
              <a href="#" className="border border-white/40 rounded-lg px-4 py-2 flex items-center gap-3 hover:border-white transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.37.21.8.22 1.2.06l11.6-6.7-2.68-2.68-10.12 9.32zM.61 1.92C.23 2.3 0 2.9 0 3.67v16.66c0 .77.23 1.37.61 1.75l.09.08 9.33-9.33v-.22L.7 1.84l-.09.08zM20.9 10.3l-2.66-1.54-2.98 2.98 2.98 2.98 2.67-1.54c.76-.44.76-1.44-.01-1.88zM4.38.18L15.98 6.88l-2.68 2.68L3.18.24c.4-.16.83-.15 1.2-.06z"/>
                </svg>
                <span className="text-xs leading-tight">
                  <span className="block text-white/60">GET IT ON</span>
                  <span className="font-semibold">Google Play</span>
                </span>
              </a>
              <a href="#" className="border border-white/40 rounded-lg px-4 py-2 flex items-center gap-3 hover:border-white transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="text-xs leading-tight">
                  <span className="block text-white/60">Download on the</span>
                  <span className="font-semibold">App Store</span>
                </span>
              </a>
            </div>

            <h4 className="font-semibold text-white mb-3 text-base">Follow us on</h4>
            <div className="flex gap-3">
              {[Facebook, Instagram, Twitter, Youtube, Linkedin].map((Icon, i) => (
                <a key={i} href="#"
                   className="text-white/70 hover:text-white transition-colors">
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/20 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-white/60">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookies Settings</a>
          </div>
          <span className="text-sm text-white/50">2023 Logo. All right reserved.</span>
        </div>
      </div>
    </footer>
  )
}
