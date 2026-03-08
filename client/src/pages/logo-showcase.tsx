import Enhanced3XBetLogo, { Compact3XBetLogo } from "@/components/enhanced-3xbet-logo";

export default function LogoShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">3XBET Logo Showcase</h1>
          <p className="text-slate-400 text-lg">Enhanced 3D logo designs with premium styling</p>
        </div>

        {/* Different Sizes */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-white text-center">Different Sizes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-center justify-items-center">
            {/* Small */}
            <div className="text-center space-y-4">
              <h3 className="text-white font-medium">Small</h3>
              <Enhanced3XBetLogo size="sm" />
            </div>

            {/* Medium */}
            <div className="text-center space-y-4">
              <h3 className="text-white font-medium">Medium</h3>
              <Enhanced3XBetLogo size="md" />
            </div>

            {/* Large */}
            <div className="text-center space-y-4">
              <h3 className="text-white font-medium">Large</h3>
              <Enhanced3XBetLogo size="lg" />
            </div>

            {/* Extra Large */}
            <div className="text-center space-y-4">
              <h3 className="text-white font-medium">Extra Large</h3>
              <Enhanced3XBetLogo size="xl" />
            </div>
          </div>
        </section>

        {/* Interactive vs Static */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-white text-center">Interactive vs Static</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Interactive */}
            <div className="text-center space-y-4 p-6 rounded-lg bg-slate-800/50 border border-slate-700">
              <h3 className="text-white font-medium">Interactive (Hover Effects)</h3>
              <Enhanced3XBetLogo size="lg" interactive={true} />
              <p className="text-sm text-slate-400">Hover to see 3D effects, shimmer, and glow</p>
            </div>

            {/* Static */}
            <div className="text-center space-y-4 p-6 rounded-lg bg-slate-800/50 border border-slate-700">
              <h3 className="text-white font-medium">Static (No Hover Effects)</h3>
              <Enhanced3XBetLogo size="lg" interactive={false} />
              <p className="text-sm text-slate-400">Clean design without animations</p>
            </div>
          </div>
        </section>

        {/* Compact Header Version */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-white text-center">Header/Compact Version</h2>
          
          <div className="text-center space-y-4">
            <div className="flex justify-center items-center p-8 rounded-lg bg-slate-800/50 border border-slate-700">
              <Compact3XBetLogo />
            </div>
            <p className="text-sm text-slate-400">Optimized for headers and navigation bars</p>
          </div>
        </section>

        {/* Color Variations Demo */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-white text-center">Usage Examples</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Dark Background */}
            <div className="p-8 rounded-lg bg-black/50 border border-slate-700">
              <h3 className="text-white font-medium mb-4 text-center">On Dark Background</h3>
              <div className="flex justify-center">
                <Enhanced3XBetLogo size="md" />
              </div>
            </div>

            {/* Custom Background */}
            <div className="p-8 rounded-lg bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-slate-700">
              <h3 className="text-white font-medium mb-4 text-center">On Gradient Background</h3>
              <div className="flex justify-center">
                <Enhanced3XBetLogo size="md" />
              </div>
            </div>
          </div>
        </section>

        {/* Design Features */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white text-center">Design Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
              <div className="text-green-400 text-2xl mb-2">🎨</div>
              <h3 className="text-white font-medium mb-2">Premium 3D Styling</h3>
              <p className="text-slate-400 text-sm">Advanced shadows, gradients, and depth effects</p>
            </div>
            
            <div className="p-6 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
              <div className="text-yellow-400 text-2xl mb-2">✨</div>
              <h3 className="text-white font-medium mb-2">Shimmer Effects</h3>
              <p className="text-slate-400 text-sm">Animated light reflections on hover</p>
            </div>
            
            <div className="p-6 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
              <div className="text-blue-400 text-2xl mb-2">⚡</div>
              <h3 className="text-white font-medium mb-2">Interactive Animations</h3>
              <p className="text-slate-400 text-sm">Smooth hover transitions and transforms</p>
            </div>
            
            <div className="p-6 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
              <div className="text-purple-400 text-2xl mb-2">🎯</div>
              <h3 className="text-white font-medium mb-2">Brand Accurate</h3>
              <p className="text-slate-400 text-sm">Matches 3XBET brand colors and style</p>
            </div>
            
            <div className="p-6 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
              <div className="text-green-400 text-2xl mb-2">📱</div>
              <h3 className="text-white font-medium mb-2">Responsive</h3>
              <p className="text-slate-400 text-sm">Multiple sizes for different contexts</p>
            </div>
            
            <div className="p-6 rounded-lg bg-slate-800/30 border border-slate-700 text-center">
              <div className="text-orange-400 text-2xl mb-2">🎮</div>
              <h3 className="text-white font-medium mb-2">Gaming Focused</h3>
              <p className="text-slate-400 text-sm">Professional betting platform aesthetic</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pt-12">
          <p className="text-slate-500">Enhanced 3XBET Logo Design</p>
        </div>

      </div>
    </div>
  );
}