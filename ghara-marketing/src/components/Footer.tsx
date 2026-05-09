import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-grey bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="text-sm font-semibold text-plum mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-plum/60">
              <li><Link href="/compliance" className="hover:text-plum">Compliance</Link></li>
              <li><Link href="/cost" className="hover:text-plum">Cost</Link></li>
              <li><Link href="/pricing" className="hover:text-plum">Pricing</Link></li>
              <li><Link href="/demo" className="hover:text-plum">Request demo</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-plum mb-3">Frameworks</h4>
            <ul className="space-y-2 text-sm text-plum/60">
              <li>SOC 2</li>
              <li>ISO 27001</li>
              <li>GDPR</li>
              <li>HIPAA</li>
              <li>PCI DSS</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-plum mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-plum/60">
              <li><a href="https://ifulabs.com" className="hover:text-plum">iFU Labs (consultancy)</a></li>
              <li><a href="https://ifulabs.com/about" className="hover:text-plum">About</a></li>
              <li><a href="mailto:info@ifulabs.com" className="hover:text-plum">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-plum mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-plum/60">
              <li><a href="https://ifulabs.com/privacy" className="hover:text-plum">Privacy</a></li>
              <li><a href="https://ifulabs.com/terms" className="hover:text-plum">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-8 border-t border-grey">
          <p className="text-xs text-plum/50">© {new Date().getFullYear()} iFU Labs. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-plum/50">Built by</span>
            <div className="w-5 h-5 rounded bg-plum flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">iFU</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
