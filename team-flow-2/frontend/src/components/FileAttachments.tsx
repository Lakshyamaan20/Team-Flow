import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { files } from "../services/api";
import { useToastStore } from "../store/toastStore";

export default function FileAttachments({ taskId }: { taskId: string }) {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: fileList } = useQuery({
    queryKey: ["files", taskId],
    queryFn: () => files.list(taskId),
  });

  const upload = useMutation({
    mutationFn: (file: File) => files.upload(taskId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", taskId] });
      addToast("File uploaded!");
    },
    onError: () => addToast("Upload failed", "error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => files.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", taskId] });
      addToast("File removed");
    },
    onError: () => addToast("Delete failed", "error"),
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) upload.mutate(dropped);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) upload.mutate(selected);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  };

  return (
    <div className="border-t border-surface-200 pt-5">
      <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Attachments</h3>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          dragOver ? "border-brand-400 bg-brand-50" : "border-surface-300 hover:border-brand-300 hover:bg-surface-50"
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={handleSelect} />
        <svg className="w-6 h-6 mx-auto mb-1 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-xs text-surface-500">Drop a file here or click to upload</p>
        <p className="text-[10px] text-surface-400 mt-0.5">Max 10MB</p>
      </div>

      {fileList && fileList.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {fileList.map((f: any) => (
            <div key={f.id} className="flex items-center justify-between bg-surface-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 shrink-0 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <a href={files.downloadUrl(f.id)} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-600 hover:text-brand-700 truncate max-w-[180px]">{f.originalName}</a>
                <span className="text-[10px] text-surface-400 shrink-0">{formatSize(f.size)}</span>
              </div>
              <button onClick={() => remove.mutate(f.id)} className="p-1 text-surface-400 hover:text-red-600 transition-colors shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
