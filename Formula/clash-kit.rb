require "language/node"

class ClashKit < Formula
  desc "A command-line interface for managing Clash configurations, subscriptions, and proxies"
  homepage "https://github.com/wangrongding/clash-kit"
  url "https://registry.npmjs.org/clash-kit/-/clash-kit-1.1.2.tgz"
  sha256 "97c689a8bcb6c1da41d9f4b15fb5564f3a904f68f6c2da69436c11123c1a7858"
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
