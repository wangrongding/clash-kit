require "language/node"

class ClashKit < Formula
  desc "A command-line interface for managing Clash configurations, subscriptions, and proxies"
  homepage "https://github.com/wangrongding/clash-kit"
  url "https://registry.npmjs.org/clash-kit/-/clash-kit-1.1.3.tgz"
  sha256 "6dfdc3e8d3554258c20db6e780a4c01fd9503339ee79f0a35ab6a24cf17bf5de"
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
