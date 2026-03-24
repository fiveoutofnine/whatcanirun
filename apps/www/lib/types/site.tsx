/**
 * Type for an external link.
 * @param name Name describing the link.
 * @param href URL of the link.
 * @param icon Optional icon to describe/represent the link.
 */
export type ExternalLink = {
  name: string;
  href: string;
  icon?: React.ReactNode;
};

/**
 * Type for a page slug on [**whatcani.run**](https://whatcani.run).
 */
export type PageSlug = '/' | '/docs';

/**
 * Type for an external page linked on [**whatcani.run**](https://whatcani.run),
 * intended to be part of configuration files (e.g. for the navigation bar
 * component).
 */
export type PageExternalLink =
  | 'https://github.com/fiveoutofnine/whatcanirun'
  | 'https://x.com/fiveoutofnine';

/**
 * Type for a page on [**whatcani.run**](https://whatcani.run), intended to be
 * part of configuration files (e.g. for the navigation bar component).
 * @param name Name describing the page.
 * @param slug Slug/URL of the page.
 * @param icon Optional icon to describe/represent the page.
 */
export type Page = {
  name: string;
  slug: PageSlug | PageExternalLink;
  icon?: React.ReactNode;
};
