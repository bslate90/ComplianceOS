export function TestingWatermark() {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
            <div className="flex justify-center pb-2">
                <div className="bg-amber-500/90 dark:bg-amber-600/90 text-black dark:text-white px-4 py-1 rounded-t-md text-xs font-bold uppercase tracking-wider shadow-lg">
                    Testing Environment
                </div>
            </div>
        </div>
    );
}
