import { ImageOff, Leaf } from "lucide-react";
import { useEffect, useState } from "react";

interface CommonsImage {
  title: string;
  thumbnailUrl: string;
  descriptionUrl: string;
  license: string;
}

interface CommonsPage {
  title: string;
  imageinfo?: {
    thumburl?: string;
    descriptionurl?: string;
    extmetadata?: { LicenseShortName?: { value?: string } };
  }[];
}

interface CommonsResponse {
  query?: { pages?: Record<string, CommonsPage> };
  error?: { info?: string };
}

const imageSearches = new Map<string, Promise<CommonsImage | null>>();

function searchTerm(crop: string, searchText?: string): string {
  if (searchText?.trim()) return searchText.trim().toLowerCase();
  const normalized = crop.trim().toLowerCase();
  if (normalized === "irish potato") return "potato crop field";
  if (normalized === "crop protection") return "crop protection agriculture";
  return `${normalized} crop field`;
}

function findCropImage(crop: string, searchText?: string): Promise<CommonsImage | null> {
  const term = searchTerm(crop, searchText);
  const cached = imageSearches.get(term);
  if (cached) return cached;

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${term}`,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "960",
    format: "json",
    origin: "*",
  });
  const request = fetch(`https://commons.wikimedia.org/w/api.php?${params}`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Image search failed (${response.status}).`);
      const payload = (await response.json()) as CommonsResponse;
      if (payload.error) throw new Error(payload.error.info || "Image search failed.");
      const pages = Object.values(payload.query?.pages ?? {});
      const cropTokens = crop.toLowerCase().split(/\s+/).filter((token) => token.length > 2);
      const relevant = pages.find((page) => {
        const title = page.title.toLowerCase();
        const cropMatch = cropTokens.some((token) => title.includes(token));
        const possessiveNameMatch = cropTokens.some((token) =>
          new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*['’]s\\b`, "i").test(title),
        );
        const agricultureMatch =
          /\b(field|farm|farmland|crop|agricultur\w*|plantation|orchard|paddy|harvest|cultivation|vegetable|grain|leaf|plant|tree|garden)\b/i.test(
            title,
          );
        const unrelatedArtwork =
          /\b(art|painting|drawing|illustration|logo|diagram|poster|book|map)\b/i.test(title);
        return (
          cropMatch &&
          !possessiveNameMatch &&
          agricultureMatch &&
          !unrelatedArtwork &&
          Boolean(page.imageinfo?.[0]?.thumburl)
        );
      });
      const page = relevant;
      const imageInfo = page?.imageinfo?.[0];
      if (!page || !imageInfo?.thumburl || !imageInfo.descriptionurl) return null;
      return {
        title: page.title.replace(/^File:/i, ""),
        thumbnailUrl: imageInfo.thumburl,
        descriptionUrl: imageInfo.descriptionurl,
        license: imageInfo.extmetadata?.LicenseShortName?.value?.trim() ?? "",
      };
    })
    .catch((error: unknown) => {
      imageSearches.delete(term);
      throw error;
    });

  imageSearches.set(term, request);
  return request;
}

export function LiveCropImage({
  crop,
  searchText,
  fallbackSrc,
  fallbackIsExample = false,
  background = false,
  className = "",
}: {
  crop: string;
  searchText?: string;
  fallbackSrc?: string;
  fallbackIsExample?: boolean;
  background?: boolean;
  className?: string;
}) {
  const [image, setImage] = useState<CommonsImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchFailed, setSearchFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setImage(null);
    setLoading(true);
    setSearchFailed(false);
    setImageFailed(false);
    findCropImage(crop, searchText)
      .then((result) => {
        if (!active) return;
        setImage(result);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSearchFailed(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [crop, searchText]);

  const showRemoteImage = Boolean(image && !imageFailed);
  const showFarmPhoto = Boolean(!showRemoteImage && fallbackSrc && !fallbackIsExample);

  return (
    <div className={`${background ? "absolute" : "relative"} overflow-hidden bg-fresh-50 ${className}`}>
      {showRemoteImage ? (
        <img
          src={image?.thumbnailUrl}
          alt={`${crop} crop reference: ${image?.title ?? crop}`}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : showFarmPhoto ? (
        <img
          src={fallbackSrc}
          alt={`${crop} crop photo uploaded by the farmer`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-fresh-50 to-fresh-100 text-forest-700">
          {searchFailed ? <ImageOff className="h-8 w-8 stroke-[1.4]" /> : <Leaf className="h-9 w-9 stroke-[1.3]" />}
          <span className="mt-2 text-xs font-medium text-forest-800">{crop}</span>
          {loading ? <span className="mt-1 text-[10px] text-slate-500">Finding a reference photo…</span> : null}
          {searchFailed ? <span className="mt-1 text-[10px] text-slate-500">Photo search unavailable</span> : null}
          {!loading && !searchFailed && !fallbackSrc ? (
            <span className="mt-1 text-[10px] text-slate-500">No crop photo available</span>
          ) : null}
        </div>
      )}

      {showRemoteImage ? (
        <a
          href={image?.descriptionUrl}
          target="_blank"
          rel="noreferrer"
          title={`View ${image?.title} and its license on Wikimedia Commons`}
          className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-forest-950/75 px-2 py-1 text-[9px] font-medium text-white backdrop-blur-sm transition hover:bg-forest-950"
        >
          Reference photo · Wikimedia Commons{image?.license ? ` · ${image.license}` : ""}
        </a>
      ) : showFarmPhoto ? (
        <span className="absolute bottom-2 left-2 rounded-md bg-forest-950/75 px-2 py-1 text-[9px] font-medium text-white">
          Farm photo
        </span>
      ) : null}
    </div>
  );
}
