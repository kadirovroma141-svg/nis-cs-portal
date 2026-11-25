"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="text-lg font-semibold">{t("Не удалось загрузить страницу")}</h1>
      <p className="text-sm text-muted">
        {t("Возможно, пропало соединение с сервером. Попробуйте ещё раз — если ошибка повторится, сообщите учителю или администратору.")}
      </p>
      {error.digest && <p className="font-mono text-xs text-muted">{t("Код ошибки:")}{" "}{error.digest}</p>}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>
          <RotateCcw className="h-4 w-4" aria-hidden />{" "}{t("Повторить")}
        </Button>
        <ButtonLink href="/" variant="secondary">
          {t("На главную")}
        </ButtonLink>
      </div>
    </div>
  );
}
