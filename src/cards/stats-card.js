// @ts-check
import { Card } from "../common/Card.js";
import { I18n } from "../common/I18n.js";
import { icons, rankIcon } from "../common/icons.js";
import {
  CustomError,
  clampValue,
  flexLayout,
  getCardColors,
  kFormatter,
  measureText,
} from "../common/utils.js";
import { statCardLocales } from "../translations.js";

const CARD_MIN_WIDTH = 287;
const CARD_DEFAULT_WIDTH = 287;
const RANK_CARD_MIN_WIDTH = 420;
const RANK_CARD_DEFAULT_WIDTH = 450;
const RANK_ONLY_CARD_MIN_WIDTH = 290;
const RANK_ONLY_CARD_DEFAULT_WIDTH = 290;

const renderStatsCard = (stats, options = {}) => {
  const {
    name,
    totalStars,
    totalCommits,
    totalIssues,
    totalPRs,
    totalPRsMerged,
    mergedPRsPercentage,
    totalReviews,
    totalDiscussionsStarted,
    totalDiscussionsAnswered,
    contributedTo,
    rank,
  } = stats;
  const {
    hide = [],
    show_icons = false,
    hide_title = false,
    hide_border = false,
    card_width,
    hide_rank = false,
    include_all_commits = false,
    line_height = 25,
    title_color,
    ring_color,
    icon_color,
    text_color,
    text_bold = true,
    bg_color,
    theme = "default",
    custom_title,
    border_radius,
    border_color,
    number_format = "short",
    locale,
    disable_animations = false,
    rank_icon = "default",
    show = [],
  } = options;

  const lheight = parseInt(String(line_height), 10);

  const { titleColor, iconColor, textColor, bgColor, borderColor, ringColor } =
    getCardColors({
      title_color,
      text_color,
      icon_color,
      bg_color,
      border_color,
      ring_color,
      theme,
    });

  const apostrophe = ["x", "s"].includes(name.slice(-1).toLocaleLowerCase())
    ? ""
    : "s";
  const i18n = new I18n({
    locale,
    translations: statCardLocales({ name, apostrophe }),
  });

  const STATS = {
    stars: { icon: icons.star, label: i18n.t("statcard.totalstars"), value: totalStars, id: "stars" },
    commits: {
      icon: icons.commits,
      label: `${i18n.t("statcard.commits")}${include_all_commits ? "" : ` (${new Date().getFullYear()})`}`,
      value: totalCommits,
      id: "commits",
    },
    prs: { icon: icons.prs, label: i18n.t("statcard.prs"), value: totalPRs, id: "prs" },
    issues: { icon: icons.issues, label: i18n.t("statcard.issues"), value: totalIssues, id: "issues" },
    contribs: { icon: icons.contribs, label: i18n.t("statcard.contribs"), value: contributedTo, id: "contribs" },
  };

  if (show.includes("prs_merged")) {
    STATS.prs_merged = {
      icon: icons.prs_merged,
      label: i18n.t("statcard.prs-merged"),
      value: totalPRsMerged,
      id: "prs_merged",
    };
  }

  if (show.includes("prs_merged_percentage")) {
    STATS.prs_merged_percentage = {
      icon: icons.prs_merged_percentage,
      label: i18n.t("statcard.prs-merged-percentage"),
      value: mergedPRsPercentage.toFixed(2),
      id: "prs_merged_percentage",
      unitSymbol: "%",
    };
  }

  if (show.includes("reviews")) {
    STATS.reviews = {
      icon: icons.reviews,
      label: i18n.t("statcard.reviews"),
      value: totalReviews,
      id: "reviews",
    };
  }

  if (show.includes("discussions_started")) {
    STATS.discussions_started = {
      icon: icons.discussions_started,
      label: i18n.t("statcard.discussions-started"),
      value: totalDiscussionsStarted,
      id: "discussions_started",
    };
  }

  if (show.includes("discussions_answered")) {
    STATS.discussions_answered = {
      icon: icons.discussions_answered,
      label: i18n.t("statcard.discussions-answered"),
      value: totalDiscussionsAnswered,
      id: "discussions_answered",
    };
  }

  const isLongLocale = locale ? [
    "cn", "es", "fr", "pt-br", "ru", "uk-ua", "id", "ml", "my", "pl", "de", "nl", "zh-tw", "uz"
  ].includes(locale) : false;

  const statItems = Object.keys(STATS)
    .filter((key) => !hide.includes(key))
    .map((key, index) =>
      createTextNode({
        icon: STATS[key].icon,
        label: STATS[key].label,
        value: STATS[key].value,
        id: STATS[key].id,
        unitSymbol: STATS[key].unitSymbol,
        index,
        showIcons: show_icons,
        shiftValuePos: 79.01 + (isLongLocale ? 50 : 0),
        bold: text_bold,
        number_format,
      })
    );

  if (statItems.length === 0 && hide_rank) {
    throw new CustomError(
      "Could not render stats card.",
      "Either stats or rank are required."
    );
  }

  const height = Math.max(
    45 + (statItems.length + 1) * lheight,
    hide_rank ? 0 : statItems.length ? 150 : 180
  );

  const progress = 100 - rank.percentile;
  const cssStyles = getStyles({ titleColor, ringColor, textColor, iconColor, show_icons, progress });

  const titleText = custom_title || `${name}'s GitHub Stats`;
  const calculateTextWidth = () => measureText(titleText);

  const iconWidth = show_icons && statItems.length ? 17 : 0;
  const minCardWidth = (hide_rank
    ? clampValue(50 + calculateTextWidth() * 2, CARD_MIN_WIDTH, Infinity)
    : statItems.length ? RANK_CARD_MIN_WIDTH : RANK_ONLY_CARD_MIN_WIDTH) + iconWidth;
  const defaultCardWidth = (hide_rank
    ? CARD_DEFAULT_WIDTH
    : statItems.length ? RANK_CARD_DEFAULT_WIDTH : RANK_ONLY_CARD_DEFAULT_WIDTH) + iconWidth;
  let width = card_width ? (isNaN(card_width) ? defaultCardWidth : card_width) : defaultCardWidth;
  width = Math.max(width, minCardWidth);

  const card = new Card({
    customTitle: titleText,
    defaultTitle: statItems.length ? i18n.t("statcard.title") : i18n.t("statcard.ranktitle"),
    width,
    height,
    border_radius,
    colors: { titleColor, textColor, iconColor, bgColor, borderColor },
  });

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  card.setCSS(cssStyles);
  if (disable_animations) card.disableAnimations();

  const calculateRankXTranslation = () => {
    if (statItems.length) {
      const minX = RANK_CARD_MIN_WIDTH + iconWidth - 70;
      return width > RANK_CARD_DEFAULT_WIDTH
        ? minX + width - RANK_CARD_DEFAULT_WIDTH
        : minX + (width - minCardWidth) / 2;
    } else {
      return width / 2 + 10;
    }
  };

  const rankCircle = hide_rank
    ? ""
    : `<g data-testid="rank-circle" transform="translate(${calculateRankXTranslation()}, ${height / 2 - 50})">
        <circle class="rank-circle-rim" cx="-10" cy="8" r="40" />
        <circle class="rank-circle" cx="-10" cy="8" r="40" />
        <g class="rank-text">
          ${rankIcon(rank_icon, rank?.level, rank?.percentile)}
        </g>
      </g>`;

  const labels = Object.keys(STATS)
    .filter((key) => !hide.includes(key))
    .map((key) => `${STATS[key].label}: ${STATS[key].value}`)
    .join(", ");

  card.setAccessibilityLabel({ title: `${card.title}, Rank: ${rank.level}`, desc: labels });

  return card.render(`
    ${rankCircle}
    <svg x="0" y="0">
      ${flexLayout({ items: statItems, gap: lheight, direction: "column" }).join("")}
    </svg>
  `);
};

export { renderStatsCard };
export default renderStatsCard;
