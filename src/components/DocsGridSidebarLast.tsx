"use client";

import { Container } from "fumadocs-ui/layouts/docs/slots/container";
import { Sidebar } from "fumadocs-ui/layouts/docs/slots/sidebar";
import { Children, isValidElement } from "react";
import type { ComponentProps, ReactNode } from "react";

type Item = ReturnType<typeof Children.toArray>[number];

function isSidebar(item: Item): boolean {
  return isValidElement(item) && item.type === Sidebar;
}

/**
 * Fumadocs renders the sidebar before the page in the DOM, so anything that reads the
 * HTML in order (an HTML-to-Markdown converter, a truncated fetch) meets the full
 * navigation tree before the first paragraph. Every region is placed by its CSS grid
 * area, so moving the sidebar to the end changes only the source order, not the layout.
 */
export function DocsGridSidebarLast({
  children,
  ...props
}: ComponentProps<"div"> & { children?: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <Container {...props}>
      {items.filter((item) => !isSidebar(item))}
      {items.filter((item) => isSidebar(item))}
    </Container>
  );
}
