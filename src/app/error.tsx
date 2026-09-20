"use client";

type ErrorPageProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center px-5 py-16 sm:px-8">
      <section className="w-full max-w-2xl border border-slate-200 bg-white p-6 sm:p-10">
        <p className="text-sm font-semibold text-slate-600">Application foundation</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          This route could not be displayed
        </h1>
        <p className="mt-4 max-w-prose text-base leading-7 text-slate-700">
          Retry the route. If the problem continues, the implementation team can investigate the
          server logs without exposing internal details here.
        </p>
        <button
          className="mt-7 min-h-11 rounded-sm bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          type="button"
          onClick={reset}
        >
          Retry route
        </button>
      </section>
    </main>
  );
}
