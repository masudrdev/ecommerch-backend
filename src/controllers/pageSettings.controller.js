import sanitizeHtml from "sanitize-html";
import prisma from "../lib/prisma.js";

export const PAGE_KEYS = [
  "ABOUT",
  "HELP_SUPPORT",
  "CONTACT",
  "RETURNS_REFUNDS",
  "SHIPPING_POLICY",
  "PRIVACY_POLICY",
  "TERMS",
  "COOKIES",
  "TRACK_ORDER",
];

const MAX_HTML_LENGTH = 100000;
const cleanKey = (value) =>
  String(value || "").trim().toUpperCase();

const cleanCardText = (value, maxLength) =>
  String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
      ""
    )
    .trim()
    .slice(0, maxLength);

const sanitizeSections = (value) => {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 30
  ) {
    return null;
  }

  const sections = value.map((section) => ({
    title: cleanCardText(section?.title, 120),
    body: cleanCardText(section?.body, 5000),
  }));

  return sections.every(
    (section) => section.title && section.body
  )
    ? sections
    : null;
};

const parseStoredSections = (value) => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const toPageResponse = (page) =>
  page
    ? {
        ...page,
        sections: parseStoredSections(
          page.sectionsJson
        ),
        sectionsJson: undefined,
      }
    : null;

const sanitizeContent = (html) =>
  sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...(attribs.href
            ? { href: attribs.href }
            : {}),
          ...(attribs.target === "_blank"
            ? {
                target: "_blank",
                rel: "noopener noreferrer",
              }
            : {}),
        },
      }),
    },
  });

export const getPublicPageContent = async (
  req,
  res
) => {
  try {
    const key = cleanKey(req.params.key);

    if (!PAGE_KEYS.includes(key)) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    const page = await prisma.pageContent.findUnique({
      where: { key },
      select: {
        key: true,
        title: true,
        contentHtml: true,
        sectionsJson: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      page: toPageResponse(page),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load page content",
    });
  }
};

export const getPageSettings = async (req, res) => {
  try {
    const pages =
      await prisma.pageContent.findMany({
        where: {
          key: { in: PAGE_KEYS },
        },
        select: {
          id: true,
          key: true,
          title: true,
          contentHtml: true,
          sectionsJson: true,
          updatedById: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { key: "asc" },
      });

    return res.json({
      success: true,
      pages: pages.map(toPageResponse),
      keys: PAGE_KEYS,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load Page Settings",
    });
  }
};

export const updatePageSetting = async (
  req,
  res
) => {
  try {
    const key = cleanKey(req.params.key);
    const title =
      typeof req.body.title === "string"
        ? req.body.title.trim()
        : "";
    const contentHtml =
      typeof req.body.contentHtml === "string"
        ? req.body.contentHtml
        : "";
    const sections = sanitizeSections(
      req.body.sections
    );

    if (!PAGE_KEYS.includes(key)) {
      return res.status(400).json({
        success: false,
        message: "Invalid page key",
      });
    }

    if (!title || title.length > 120) {
      return res.status(400).json({
        success: false,
        message:
          "Title must be between 1 and 120 characters",
      });
    }

    if (
      !contentHtml.trim() ||
      contentHtml.length > MAX_HTML_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Content is required and must be 100,000 characters or less",
      });
    }

    if (!sections) {
      return res.status(400).json({
        success: false,
        message:
          "Every card must have a valid title and content",
      });
    }

    const sanitizedHtml =
      sanitizeContent(contentHtml).trim();

    if (!sanitizedHtml) {
      return res.status(400).json({
        success: false,
        message:
          "Content cannot be empty after sanitization",
      });
    }

    const sectionsJson = JSON.stringify(sections);
    const page = await prisma.pageContent.upsert({
      where: { key },
      update: {
        title,
        contentHtml: sanitizedHtml,
        sectionsJson,
        updatedById: req.user.id,
      },
      create: {
        key,
        title,
        contentHtml: sanitizedHtml,
        sectionsJson,
        updatedById: req.user.id,
      },
    });

    return res.json({
      success: true,
      message: "Page content saved",
      page: toPageResponse(page),
    });
  } catch (error) {
    console.error("Update Page Settings Error:", error);
    return res.status(500).json({
      success: false,
      message:
        error?.code === "P2022"
          ? "Page Settings database migration is missing"
          : error.message ||
            "Unable to save page content",
    });
  }
};

export { sanitizeContent };
