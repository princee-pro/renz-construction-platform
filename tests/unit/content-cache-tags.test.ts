import { describe, expect, it } from "vitest";

import {
  contentCollectionTag,
  contentItemTag,
  homepageTag,
  navigationTag,
  publicSettingsTag,
  tagsForContent,
} from "../../src/lib/content/cache-tags";

describe("S4 cache tag contract", () => {
  it("keeps collection, item, and composition tags deterministic", () => {
    expect(contentCollectionTag("project")).toBe("content:projects");
    expect(contentItemTag("project", "project-1")).toBe("content:project:project-1");
    expect(tagsForContent("service", "service-1")).toEqual([
      "content:services",
      "content:service:service-1",
      "homepage",
    ]);
    expect(homepageTag()).toBe("homepage");
  });

  it("names navigation and settings scopes without accepting arbitrary tags", () => {
    expect(navigationTag()).toBe("navigation");
    expect(navigationTag("menu-1")).toBe("navigation:menu-1");
    expect(publicSettingsTag()).toBe("public-settings");
    expect(publicSettingsTag("website.public", "site_title")).toBe(
      "public-settings:website.public:site_title",
    );
  });
});
