require "language/node"

class ClashKit < Formula
  desc "A command-line interface for managing Clash configurations, subscriptions, and proxies"
  homepage "https://github.com/wangrongding/clash-kit"
  url "https://registry.npmjs.org/clash-kit/-/clash-kit-1.1.0.tgz"
  sha256 "39f8f5d1fcc988348399e593223b1c1552b2be4ee1a7234c49ea10bd9ef42671"
  license "ISC"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/ck", "--version"
  end
end
