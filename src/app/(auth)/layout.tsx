export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-12">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            <div className="relative z-10 w-full max-w-[min(100%,420px)] sm:max-w-md md:max-w-lg">
                {children}
            </div>
        </div>
    );
}

