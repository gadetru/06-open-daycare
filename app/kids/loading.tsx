export default function KidsLoading() {
  return (
    <div className="flex min-h-full bg-background">
      <main className="h-screen min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] px-6 pb-20 pt-[34px] sm:px-10">
          <div className="mb-[22px] animate-pulse">
            <div className="mb-2 h-3 w-20 rounded bg-border" />
            <div className="h-8 w-32 rounded bg-border" />
          </div>
          <div className="mb-[22px] h-[48px] animate-pulse rounded-[14px] bg-border" />
          <div className="space-y-[28px]">
            {[0, 1].map((group) => (
              <div key={group}>
                <div className="mb-[14px] h-4 w-48 animate-pulse rounded bg-border" />
                <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
                  {[0, 1, 2].map((card) => (
                    <div
                      key={card}
                      className="h-[80px] animate-pulse rounded-[18px] bg-border"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
