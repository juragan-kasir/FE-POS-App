import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CloudUpload, ImagePlus, Trash2, ChevronLeft, ChevronRight, Eye, Star } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Modal from "@/components/organism/modal";
import { cn } from "@/lib/utils";
import { safeGet } from "@/lib/safe-lookup";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Professional multi-image gallery for product forms.
 * Controlled component:
 *   images = [{ url, file?, isNew }]   (first item = main image)
 *   onChange(updater)                 setter compatible with useState
 */
const ProductImageGallery = ({ images = [], onChange, maxImages = 6, compact = false }) => {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [zoomIndex, setZoomIndex] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    const urls = images
      .filter((i) => i.isNew && i.url && i.url.startsWith("blob:"))
      .map((i) => i.url);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const handleFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    e.target.value = "";
    if (incoming.length === 0) return;

    const tooLarge = incoming.find((f) => f.size > MAX_FILE_SIZE);
    if (tooLarge) {
      toast.error(t("page.product.form.imgFileTooLarge"));
      return;
    }

    const room = maxImages - images.length;
    if (room <= 0) {
      toast.error(t("page.product.form.imgMaxReached", { count: maxImages }));
      return;
    }

    const accepted = incoming.slice(0, room);
    if (accepted.length < incoming.length) {
      toast.info(t("page.product.form.imgMaxReached", { count: maxImages }));
    }

    onChange((prev) => [
      ...prev,
      ...accepted.map((file) => ({ file, url: URL.createObjectURL(file), isNew: true }))
    ]);
  };

  const confirmRemove = (idx) => {
    const target = safeGet(images, idx);
    if (!target?.isNew) {
      setRemoveTarget(idx);
      return;
    }
    onChange((prev) => {
      const removed = prev.at(idx);
      if (removed?.isNew && removed.url?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.url);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const doRemove = (idx) => {
    onChange((prev) => {
      const removed = prev.at(idx);
      if (removed?.isNew && removed.url?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.url);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    onChange((prev) =>
      prev.map((item, i) => {
        if (i === idx) return safeGet(prev, target);
        if (i === target) return safeGet(prev, idx);
        return item;
      })
    );
  };

  const setPrimary = (idx) => {
    if (idx === 0) return;
    onChange((prev) => [safeGet(prev, idx), ...prev.filter((_, i) => i !== idx)]);
    toast.success(t("page.product.form.imgPrimarySet"));
  };

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudUpload size={18} className="text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            {t("page.product.form.imageSection")}
          </h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {images.length} / {maxImages}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, idx) => (
          <div
            key={`${img.isNew ? "new" : "url"}-${idx}-${img.url || img.file?.name}`}
            className="group relative">
            <div
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-zoom-in",
                idx === 0
                  ? "border-primary shadow-md ring-2 ring-primary/20"
                  : "border-border hover:border-muted-foreground/40"
              )}
              onClick={() => setZoomIndex(idx)}>
              <img
                src={img.url}
                alt={`${t("page.product.form.imageN")} ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {idx === 0 && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm">
                  <Star size={10} fill="currentColor" />
                  {t("page.product.form.imgMain")}
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-xs font-medium shadow-sm">
                {idx + 1}
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>

            <div className="absolute top-2 right-2 flex flex-col gap-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
              {idx > 0 && (
                <button
                  type="button"
                  title={t("page.product.form.imgMoveLeft")}
                  onClick={(e) => {
                    e.stopPropagation();
                    move(idx, -1);
                  }}
                  className="p-1.5 bg-background/90 backdrop-blur-sm rounded-full text-muted-foreground hover:text-foreground shadow-sm">
                  <ChevronLeft size={14} />
                </button>
              )}
              {idx < images.length - 1 && (
                <button
                  type="button"
                  title={t("page.product.form.imgMoveRight")}
                  onClick={(e) => {
                    e.stopPropagation();
                    move(idx, 1);
                  }}
                  className="p-1.5 bg-background/90 backdrop-blur-sm rounded-full text-muted-foreground hover:text-foreground shadow-sm">
                  <ChevronRight size={14} />
                </button>
              )}
              <button
                type="button"
                title={t("page.product.form.imgZoom")}
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomIndex(idx);
                }}
                className="p-1.5 bg-background/90 backdrop-blur-sm rounded-full text-muted-foreground hover:text-foreground shadow-sm">
                <Eye size={14} />
              </button>
              <button
                type="button"
                title={t("page.product.form.imgRemove")}
                onClick={(e) => {
                  e.stopPropagation();
                  confirmRemove(idx);
                }}
                className="p-1.5 bg-background/90 backdrop-blur-sm rounded-full text-muted-foreground hover:text-destructive shadow-sm">
                <Trash2 size={14} />
              </button>
            </div>

            <div className="mt-1.5 px-0.5 flex items-center justify-between gap-1">
              {idx === 0 ? (
                <span className="text-xs font-medium text-primary">
                  {t("page.product.form.imgMainLabel")}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPrimary(idx)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors truncate">
                  {t("page.product.form.imgMakeMain")}
                </button>
              )}
              <span
                className={cn(
                  "text-xs text-muted-foreground/70 truncate max-w-[55%]",
                  img.isNew && "text-blue-500"
                )}>
                {img.isNew
                  ? t("page.product.form.imgPending")
                  : img.file?.name || `${t("page.product.form.imageN")} ${idx + 1}`}
              </span>
            </div>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary bg-muted/20 hover:bg-muted/40 group">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <ImagePlus size={22} />
            </div>
            <div className="text-center px-2">
              <p className="text-sm font-medium">{t("page.product.form.imgAdd")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("page.product.form.imgClick")}
              </p>
            </div>
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t("page.product.form.imgHint")}</p>

      <Dialog open={zoomIndex !== null} onOpenChange={() => setZoomIndex(null)}>
        <DialogContent withX className="sm:max-w-3xl p-3">
          {safeGet(images, zoomIndex) && (
            <img
              src={safeGet(images, zoomIndex)?.url}
              alt={`${t("page.product.form.imageN")} ${zoomIndex + 1}`}
              className="w-full max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      <Modal
        open={removeTarget !== null}
        onOpenChange={() => setRemoveTarget(null)}
        type="confirm"
        title={t("page.product.form.imgRemoveTitle")}
        description={t("page.product.form.imgRemoveDesc")}
        confirmText={t("page.product.form.imgRemoveConfirm")}
        confirmVariant="destructive"
        onConfirm={() => {
          if (removeTarget !== null) doRemove(removeTarget);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
};

export default ProductImageGallery;
