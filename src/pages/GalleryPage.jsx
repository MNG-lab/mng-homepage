import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { galleryData } from "../content/gallery-data";
import { useLanguage } from "../context/LanguageContext";
import { resolveContentImageSrc } from "../utils/resolve-content-image-src";

const styles = {
  section: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: `${spacing[12]} ${spacing[6]} ${spacing[16]}`,
  },
  eyebrow: {
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xs,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: colors.brand.gold,
  },
  title: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
    fontFamily: typography.fontFamily.serif,
    fontSize: "clamp(2rem, 5vw, 3rem)",
    color: colors.brand.navy,
  },
  description: {
    margin: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  albumGrid: {
    marginTop: spacing[6],
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: spacing[4],
  },
  albumCard: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 14,
    padding: spacing[4],
    display: "flex",
    flexDirection: "column",
    gap: spacing[3],
    cursor: "pointer",
    textAlign: "left",
  },
  albumCardActive: {
    borderColor: colors.brand.accent,
    boxShadow: "0 10px 26px rgba(11,29,58,0.08)",
  },
  albumCoverWrap: {
    borderRadius: 10,
    overflow: "hidden",
    border: `1px solid ${colors.border.soft}`,
    aspectRatio: "4 / 3",
    background: colors.surface.subtle,
  },
  albumCover: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  albumMeta: {
    margin: 0,
    color: colors.brand.accent,
    fontSize: typography.fontSize.xs,
  },
  albumTitle: {
    margin: 0,
    color: colors.brand.navy,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.lg,
  },
  viewerSection: {
    marginTop: spacing[8],
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 14,
    padding: spacing[5],
  },
  viewerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[3],
    flexWrap: "wrap",
  },
  viewerTitle: {
    margin: 0,
    color: colors.brand.navy,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xl,
  },
  photoGrid: {
    marginTop: spacing[5],
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: spacing[4],
  },
  photoCard: {
    background: colors.surface.base,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 10,
    overflow: "hidden",
  },
  photoWrap: {
    aspectRatio: "4 / 3",
    background: colors.surface.subtle,
    position: "relative",
  },
  photoButton: {
    width: "100%",
    height: "100%",
    border: 0,
    padding: 0,
    margin: 0,
    background: "transparent",
    cursor: "zoom-in",
    display: "block",
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  caption: {
    margin: 0,
    padding: spacing[2],
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.relaxed,
  },
  lightboxOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(9, 12, 18, 0.82)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[5],
  },
  lightboxPanel: {
    position: "relative",
    maxWidth: "min(94vw, 1600px)",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    gap: spacing[3],
    alignItems: "center",
  },
  lightboxImage: {
    maxWidth: "100%",
    maxHeight: "84vh",
    width: "auto",
    height: "auto",
    borderRadius: 10,
    boxShadow: "0 20px 56px rgba(0,0,0,0.42)",
    background: "#111",
  },
  lightboxCaption: {
    margin: 0,
    color: "rgba(255,255,255,0.88)",
    fontSize: typography.fontSize.sm,
    textAlign: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 34,
    height: 34,
    borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(0,0,0,0.62)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: "1",
  },
};

const copy = {
  eyebrow: { ko: "갤러리", en: "Gallery" },
  title: { ko: "활동 아카이브", en: "Activity Archive" },
  description: {
    ko: "사진첩 카드를 눌러 바로 해당 아카이브를 확인할 수 있습니다.",
    en: "Click an album card to directly view its archive.",
  },
  photos: { ko: "사진", en: "photos" },
  none: { ko: "표시할 갤러리 데이터가 없습니다.", en: "No gallery data available." },
};

function toLightboxSrc(src) {
  if (typeof src !== "string") return "";
  return src.replace(/w_\d+,h_\d+,/i, "w_1280,h_1280,").replace(/q_\d+/i, "q_80");
}

export default function GalleryPage() {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const albums = useMemo(() => {
    return galleryData
      .filter((item) => (item.images?.length ?? 0) > 0)
      .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99) || b.year - a.year);
  }, []);
  const [activeAlbumId, setActiveAlbumId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxDisplaySrc, setLightboxDisplaySrc] = useState("");
  const highResCacheRef = useRef(new Set());
  const lastAppliedQueryRef = useRef("");
  const querySelector = useMemo(() => {
    const queryKey = searchParams.toString();
    const yearValue = searchParams.get("year");
    const parsedYear = yearValue === null ? null : Number(yearValue);
    const categoryValue = searchParams.get("category");

    return {
      key: queryKey,
      year: parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null,
      category: categoryValue || null,
    };
  }, [searchParams]);
  const queryAlbumId = useMemo(() => {
    if (!albums.length) return null;
    if (!querySelector.year && !querySelector.category) return null;

    const matched = albums.find((album) => {
      const legacyYear = Number(album.legacyQuery?.year ?? album.year);
      const legacyCategory = String(album.legacyQuery?.category ?? album.category);
      const yearMatch = querySelector.year === null || legacyYear === querySelector.year;
      const categoryMatch = !querySelector.category || legacyCategory === querySelector.category;
      return yearMatch && categoryMatch;
    });
    return matched?.id ?? null;
  }, [albums, querySelector.category, querySelector.year]);

  function openLightbox(image) {
    setLightboxImage(image);
    setLightboxDisplaySrc(resolveContentImageSrc(image.src));
  }

  useEffect(() => {
    if (!albums.length) return;
    if (activeAlbumId && albums.some((item) => item.id === activeAlbumId)) return;
    setActiveAlbumId(albums[0].id);
  }, [activeAlbumId, albums]);

  useEffect(() => {
    if (!querySelector.key) return;
    if (lastAppliedQueryRef.current === querySelector.key) return;
    lastAppliedQueryRef.current = querySelector.key;
    if (queryAlbumId) {
      setActiveAlbumId(queryAlbumId);
    }
  }, [queryAlbumId, querySelector.key]);

  useEffect(() => {
    if (!lightboxImage) return undefined;

    const hiResSrc = toLightboxSrc(resolveContentImageSrc(lightboxImage.src));
    if (highResCacheRef.current.has(hiResSrc)) {
      setLightboxDisplaySrc(hiResSrc);
    } else {
      let active = true;
      const preloader = new Image();
      preloader.decoding = "async";
      preloader.src = hiResSrc;
      preloader.onload = () => {
        if (!active) return;
        highResCacheRef.current.add(hiResSrc);
        setLightboxDisplaySrc(hiResSrc);
      };
      return () => {
        active = false;
      };
    }

    return undefined;
  }, [lightboxImage]);

  useEffect(() => {
    if (!lightboxImage) return undefined;
    function handleEscape(event) {
      if (event.key === "Escape") {
        setLightboxImage(null);
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [lightboxImage]);

  if (albums.length === 0) {
    return (
      <section style={styles.section}>
        <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
        <h1 style={styles.title}>{t(copy.title)}</h1>
        <p style={styles.description}>{t(copy.none)}</p>
      </section>
    );
  }

  const activeAlbum = albums.find((item) => item.id === activeAlbumId) ?? albums[0];
  const hidePhotoCaption = Boolean(activeAlbum.hideCaptions);

  return (
    <section style={styles.section} aria-labelledby="gallery-title">
      <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
      <h1 id="gallery-title" style={styles.title}>
        {t(copy.title)}
      </h1>
      <p style={styles.description}>{t(copy.description)}</p>

      <div style={styles.albumGrid} role="tablist" aria-label={language === "ko" ? "사진첩 선택" : "Album selection"}>
        {albums.map((album) => {
          const selected = album.id === activeAlbum.id;
          return (
            <button
              key={album.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`gallery-album-${album.id}`}
              onClick={() => setActiveAlbumId(album.id)}
              style={{ ...styles.albumCard, ...(selected ? styles.albumCardActive : {}) }}
            >
              <div style={styles.albumCoverWrap}>
                <img
                  src={resolveContentImageSrc(album.images[0].src)}
                  alt={t(album.images[0].alt)}
                  style={styles.albumCover}
                  loading="lazy"
                />
              </div>
              <p style={styles.albumMeta}>
                {album.year} · {album.images.length} {t(copy.photos)}
              </p>
              <h2 style={styles.albumTitle}>{t(album.title)}</h2>
            </button>
          );
        })}
      </div>

      <section id={`gallery-album-${activeAlbum.id}`} style={styles.viewerSection} role="tabpanel">
        <div style={styles.viewerHeader}>
          <h2 style={styles.viewerTitle}>{t(activeAlbum.title)}</h2>
        </div>

        <div style={styles.photoGrid}>
          {activeAlbum.images.map((image) => (
            <figure key={image.id} style={styles.photoCard}>
              <div style={styles.photoWrap}>
                <button
                  type="button"
                  style={styles.photoButton}
                  aria-label={language === "ko" ? "사진 확대 보기" : "Open full-size image"}
                  onClick={() => openLightbox(image)}
                >
                  <img src={resolveContentImageSrc(image.src)} alt={t(image.alt)} style={styles.photo} loading="lazy" />
                </button>
              </div>
              {hidePhotoCaption ? null : <figcaption style={styles.caption}>{t(image.caption)}</figcaption>}
            </figure>
          ))}
        </div>
      </section>

      {lightboxImage ? (
        <div
          style={styles.lightboxOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={language === "ko" ? "이미지 확대 보기" : "Image preview"}
          onClick={() => setLightboxImage(null)}
        >
          <div style={styles.lightboxPanel} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              style={styles.lightboxClose}
              aria-label={language === "ko" ? "닫기" : "Close"}
              onClick={() => setLightboxImage(null)}
            >
              ×
            </button>
            <img
              src={lightboxDisplaySrc || resolveContentImageSrc(lightboxImage.src)}
              alt={t(lightboxImage.alt)}
              style={styles.lightboxImage}
              loading="eager"
              decoding="async"
            />
            {hidePhotoCaption ? null : <p style={styles.lightboxCaption}>{t(lightboxImage.caption)}</p>}
          </div>
        </div>
      ) : null}
    </section>
  );
}
