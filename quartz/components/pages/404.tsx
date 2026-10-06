import { i18n } from "../../i18n"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const NotFound: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  // If baseUrl contains a pathname after the domain, use this as the home link
  const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
  const baseDir = url.pathname

  // Quartz emits `page.html` instead of `page/index.html`, so a trailing slash
  // on a non-folder path 404s on GitHub Pages. Retry once without the slash
  // before showing the error.
  const retryScript = `
    (function () {
      var path = window.location.pathname;
      var baseDir = ${JSON.stringify(baseDir)};
      if (path.length > 1 && path.endsWith("/") && path !== baseDir) {
        window.location.replace(path.slice(0, -1) + window.location.search + window.location.hash);
      }
    })();
  `

  return (
    <article class="popover-hint">
      <script dangerouslySetInnerHTML={{ __html: retryScript }} />
      <h1>404</h1>
      <p>{i18n(cfg.locale).pages.error.notFound}</p>
      <a href={baseDir}>{i18n(cfg.locale).pages.error.home}</a>
    </article>
  )
}

export default (() => NotFound) satisfies QuartzComponentConstructor
