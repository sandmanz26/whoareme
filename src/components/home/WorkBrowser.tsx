import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { SectionHeading } from "./SectionHeading";
import { FilterBar, type Filters } from "./FilterBar";
import { WorkCard } from "@/components/work/WorkCard";
import { Button } from "@/components/ui/Button";
import { ArrowUpRight, Search } from "@/components/ui/Icon";
import { useNavigate } from "react-router-dom";
import type { Work } from "@/data/work";
import type { Author } from "@/lib/authors";
import { useAdmin } from "@/hooks/useAdmin";

const PAGE_SIZE = 6;

interface WorkBrowserProps {
  work: Work[];
  authors: Map<string, Author>;
  filters: Filters;
  skillFacets: string[];
  onFilterChange: (patch: Partial<Filters>) => void;
  onResetFilters: () => void;
  onJoin: () => void;
}

/**
 * The section the product is really about: real work, filterable by craft and
 * topic. Unlike a shots feed, each card has to carry a problem and a result -
 * the cover is generated so nobody can win the grid with a prettier mockup.
 */
export function WorkBrowser({
  work,
  authors,
  filters,
  skillFacets,
  onFilterChange,
  onResetFilters,
  onJoin,
}: WorkBrowserProps) {
  const navigate = useNavigate();
  const { copy } = useAdmin();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Every filter belongs in the signature. Leave one out and paging silently
  // keeps the old offset when that filter changes.
  const signature = [
    filters.role,
    filters.topic,
    filters.practice,
    filters.model,
    filters.experience,
    filters.language,
    filters.skills,
  ]
    .map((values) => values.join(","))
    .concat(filters.query)
    .join("|");
  const [lastSignature, setLastSignature] = useState(signature);
  if (signature !== lastSignature) {
    setLastSignature(signature);
    setVisibleCount(PAGE_SIZE);
  }

  const visible = work.slice(0, visibleCount);

  return (
    <section
      id="work"
      className="scroll-mt-24 border-t border-line py-20 sm:py-28"
    >
      <Container>
        <SectionHeading
          title={
            <>
              The work, <span className="text-muted">not the mockup</span>
            </>
          }
          description={copy("home.work.description")}
          action={
            <Button variant="outline" onClick={() => navigate("/work")}>
              See all portfolios
              <ArrowUpRight size={17} />
            </Button>
          }
        />

        <div className="mt-10">
          <FilterBar
            filters={filters}
            onChange={onFilterChange}
            onReset={onResetFilters}
            resultCount={work.length}
            resultNoun={work.length === 1 ? "case study" : "case studies"}
            skillOptions={skillFacets}
            showAll
          />
        </div>

        {work.length > 0 ? (
          <>
            <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((item, index) => (
                <li key={item.id} className="flex min-w-0">
                  <WorkCard
                    work={item}
                    author={authors.get(item.authorId)}
                    index={index}
                  />
                </li>
              ))}
            </ul>

            {visibleCount < work.length && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                >
                  Show {Math.min(PAGE_SIZE, work.length - visibleCount)} more
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="mt-8 flex flex-col items-center rounded-card border border-dashed border-ink/20 bg-card px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-pill bg-paper-2 text-muted">
              <Search size={22} />
            </span>
            <h3 className="display mt-5 text-xl">No case studies here yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Nothing matches this craft and topic combination. Widen the
              filters - or publish the first one.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={onResetFilters}>
                Clear filters
              </Button>
              <Button onClick={onJoin}>Publish your work</Button>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
