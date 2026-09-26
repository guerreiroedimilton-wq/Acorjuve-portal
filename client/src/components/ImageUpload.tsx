import { ImagePlus, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function ImageUpload({ value, onUploaded }: { value?: string | null; onUploaded: (url: string) => void }) {
  const upload = trpc.portal.admin.uploadImage.useMutation({ onSuccess: data => { onUploaded(data.url); toast.success("Imagem enviada com segurança."); }, onError: error => toast.error(error.message) });
  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error("Envie uma imagem JPG, PNG ou WEBP."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1];
      if (base64) upload.mutate({ filename: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", base64 });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  return <div className="image-uploader"><label className="upload-box"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} disabled={upload.isPending} />{upload.isPending ? <><LoaderCircle className="spin" /> Enviando imagem…</> : <><ImagePlus /> Selecionar imagem</>}<small>JPG, PNG ou WEBP · até 5 MB</small></label>{value && <img src={value} alt="Prévia da imagem selecionada" />}</div>;
}
