import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center px-5 py-16 sm:px-8">
      <section className="w-full max-w-2xl border border-slate-200 bg-white p-6 sm:p-10">
        <p className="text-sm font-semibold text-slate-600">Application foundation</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Route not found
        </h1>
        <p className="mt-4 max-w-prose text-base leading-7 text-slate-700">
          This technical shell currently exposes only the approved foundation route.
        </p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center rounded-sm bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          href="/"
        >
          Return to application foundation
        </Link>
      </section>
    </main>
  );
}
