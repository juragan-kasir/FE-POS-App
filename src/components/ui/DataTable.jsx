import { safeGet } from "@/lib/safe-lookup";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Inbox,
  Plus,
  RotateCcw,
  SearchX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import ActionLegend from "@/components/ui/ActionLegend";
import TableActionLegend from "@/components/ui/TableActionLegend";

const DataTable = ({
  columns = [],
  data = [],
  isLoading,
  isError,
  errorMessage: errorMessageProp,
  onRetry,
  emptyMessage: emptyMessageProp,
  emptyIcon: EmptyIcon = Inbox,
  // { label, onClick } — e.g. "Tambah Produk" when the list has no data yet.
  emptyAction,
  containerClassName,
  toolbar,
  pagination,
  onRowClick,
  rowClassName,
  selectable = false,
  selectedIds = [],
  onSelectionChange = () => {},
  isSelectable,
  rowKey,
  // ponytail: single prop for bulk action bar, called with (selectedIds, clearSelection)
  // e.g. bulkActions={(ids, clear) => <button onClick={() => { deleteItems(ids); clear(); }}>Delete</button>}
  bulkActions,
  // expandable rows: render a row beneath each row when expanded
  renderExpandedRow,
  getRowCanExpand
}) => {
  const { t } = useTranslation();
  const emptyMessage = emptyMessageProp ?? t("common.noData");
  const errorMessage = errorMessageProp ?? t("common.loadError");
  // A TableToolbar passed as `toolbar` tells whether filters are narrowing
  // the list, so an empty result can say "nothing matches" and offer the
  // reset instead of implying there is no data at all.
  const toolbarProps = React.isValidElement(toolbar) ? toolbar.props : {};
  const isFiltered = Boolean(toolbarProps.isFiltered);
  const onResetFilters = toolbarProps.onReset;
  const legendItems = columns.flatMap((col) => (Array.isArray(col.legend) ? col.legend : []));
  const [expandedRows, setExpandedRows] = React.useState(new Set());
  const scrollRef = React.useRef(null);
  const roRef = React.useRef(null);
  const stickyThRefs = React.useRef(new Map());
  const [stickyLeftOffsets, setStickyLeftOffsets] = React.useState({});
  const [containerWidth, setContainerWidth] = React.useState(0);

  const getCellStyle = (col, colIndex) => {
    const style = col.width ? { width: col.width } : {};
    if (col.stickyLeft)
      style.left = safeGet(stickyLeftOffsets, colIndex) ?? col.stickyLeftOffset ?? 0;
    return style;
  };

  const scrollRefCallback = React.useCallback((node) => {
    if (roRef.current) roRef.current.disconnect();
    scrollRef.current = node;
    if (node) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) setContainerWidth(entry.contentRect.width);
      });
      ro.observe(node);
      roRef.current = ro;
    }
  }, []);

  const toggleRowExpanded = (rowId) => {
    if (scrollRef.current) setContainerWidth(scrollRef.current.clientWidth);
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const getRowId = (row) => {
    if (rowKey) return typeof rowKey === "function" ? rowKey(row) : safeGet(row, rowKey);
    return row.id || row._id;
  };

  const isRowSelectable = (row) => (isSelectable ? isSelectable(row) : true);
  const isExpandedCheck = (rowId) => expandedRows.has(rowId);

  const currentPageSelectableIds = data.filter(isRowSelectable).map(getRowId);
  const isAllSelected =
    currentPageSelectableIds.length > 0 &&
    currentPageSelectableIds.every((id) => selectedIds.includes(id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange(selectedIds.filter((id) => !currentPageSelectableIds.includes(id)));
    } else {
      const newIds = [
        ...selectedIds.filter((id) => !currentPageSelectableIds.includes(id)),
        ...currentPageSelectableIds
      ];
      onSelectionChange(newIds);
    }
  };

  const toggleSelectRow = (row) => {
    if (!isRowSelectable(row)) return;
    const id = getRowId(row);
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((sid) => sid !== id) : [...selectedIds, id]
    );
  };

  const expandCol = renderExpandedRow
    ? {
        header: "",
        className: "w-10 px-2",
        stickyLeft: true,
        render: (row) => {
          const canExpand = getRowCanExpand ? getRowCanExpand(row) : true;
          if (!canExpand) return null;
          const rowId = getRowId(row);
          const isExpanded = expandedRows.has(rowId);
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleRowExpanded(rowId);
              }}
              aria-label={isExpanded ? t("common.collapseRow") : t("common.expandRow")}
              aria-expanded={isExpanded}
              className="p-1 hover:bg-accent rounded transition-colors">
              <ChevronRight
                size={14}
                className={cn("transition-transform duration-200", isExpanded && "rotate-90")}
              />
            </button>
          );
        }
      }
    : null;

  const allColumns = [
    ...(expandCol ? [expandCol] : []),
    ...(selectable
      ? [
          {
            header: (
              <Checkbox
                checked={
                  currentPageSelectableIds.length === 0
                    ? false
                    : isSomeSelected
                      ? "indeterminate"
                      : isAllSelected
                }
                disabled={currentPageSelectableIds.length === 0}
                onCheckedChange={toggleSelectAll}
              />
            ),
            render: (row) =>
              isRowSelectable(row) ? (
                <Checkbox
                  checked={selectedIds.includes(getRowId(row))}
                  onCheckedChange={() => toggleSelectRow(row)}
                />
              ) : null
          },
          ...columns
        ]
      : columns)
  ];

  const measureStickyLeft = React.useCallback(() => {
    // ponytail: kumpulkan pasangan dulu, bangun objek via fromEntries — bebas object injection
    const entries = [];
    let cumulative = 0;
    allColumns.forEach((col, i) => {
      if (!col.stickyLeft) return;
      entries.push([i, cumulative]);
      const el = stickyThRefs.current.get(i);
      cumulative += el ? el.getBoundingClientRect().width : 0;
    });
    const offsets = Object.fromEntries(entries);
    setStickyLeftOffsets((prev) =>
      JSON.stringify(prev) === JSON.stringify(offsets) ? prev : offsets
    );
  }, [allColumns]);

  React.useEffect(() => {
    measureStickyLeft();
    const els = [...stickyThRefs.current.values()].filter(Boolean);
    if (els.length === 0) return;
    const ro = new ResizeObserver(measureStickyLeft);
    els.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [measureStickyLeft]);

  const renderTable = () => {
    if (isError) {
      return (
        <div className="px-4 py-12 text-center text-muted-foreground">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30 text-destructive" />
          <p>{errorMessage}</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
              {t("common.retry")}
            </Button>
          )}
        </div>
      );
    }

    if (data.length === 0 && isFiltered) {
      return (
        <div className="px-4 py-12 text-center text-muted-foreground">
          <SearchX size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">{t("dataTable.noMatchTitle")}</p>
          <p className="mt-1 text-sm">{t("dataTable.noMatchDescription")}</p>
          {onResetFilters && (
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onResetFilters}>
              <RotateCcw size={14} />
              {t("common.resetFilter")}
            </Button>
          )}
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="px-4 py-12 text-center text-muted-foreground">
          {EmptyIcon && <EmptyIcon size={40} className="mx-auto mb-3 opacity-30" />}
          <p>{emptyMessage}</p>
          {emptyAction && (
            <Button
              variant="success"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={emptyAction.onClick}>
              <Plus size={14} />
              {emptyAction.label}
            </Button>
          )}
        </div>
      );
    }

    return (
      <HorizontalScrollArea viewportRef={scrollRefCallback} contentKey={data}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground">
              {allColumns.map((col, i) => (
                <th
                  key={i}
                  ref={(el) => {
                    stickyThRefs.current.set(i, el);
                  }}
                  style={getCellStyle(col, i)}
                  className={cn(
                    "px-6 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.stickyRight &&
                      "sticky right-0 bg-card shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]",
                    col.stickyLeft &&
                      "sticky left-0 bg-card shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] z-10",
                    col.hideOn && `hidden ${col.hideOn}:table-cell`,
                    col.className
                  )}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.flatMap((row, rowIndex) => {
              const rowId = getRowId(row);
              const rows = [
                <tr
                  key={rowId !== undefined && rowId !== null ? rowId : rowIndex}
                  onClick={() => onRowClick?.(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "hover:bg-accent/30 transition-colors",
                    onRowClick &&
                      "cursor-pointer focus-visible:outline-none focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    rowClassName?.(row, rowIndex)
                  )}>
                  {allColumns.map((col, colIndex) => {
                    const isCheckboxCol = selectable && !expandCol && colIndex === 0;
                    return (
                      <td
                        key={colIndex}
                        style={getCellStyle(col, colIndex)}
                        onClick={isCheckboxCol ? (e) => e.stopPropagation() : undefined}
                        className={cn(
                          "px-6 py-3.5 text-xs font-semibold tracking-wider whitespace-nowrap",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.stickyRight &&
                            "sticky right-0 bg-card shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]",
                          col.stickyLeft &&
                            "sticky left-0 bg-card shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] z-10",
                          col.hideOn && `hidden ${col.hideOn}:table-cell`,
                          col.className
                        )}>
                        {col.render
                          ? col.render(row, rowIndex)
                          : col.cell
                            ? col.cell({ row: { original: row }, index: rowIndex })
                            : col.accessor
                              ? row[col.accessor]
                              : col.accessorKey
                                ? row[col.accessorKey]
                                : null}
                        {col.statusChip && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold rounded-full",
                              col.statusChip.value === "success"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : col.statusChip.value === "warning"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                  : col.statusChip.value === "error"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                                    : "bg-muted-foreground/40 text-muted-foreground",
                              "px-2 py-0.5"
                            )}>
                            {col.statusChip.label}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ];
              if (isExpandedCheck(rowId) && renderExpandedRow) {
                rows.push(
                  <tr key={`expanded-${rowId}`}>
                    <td colSpan={allColumns.length} className="px-0 py-0">
                      <div
                        className="sticky left-0 bg-muted/20 px-6 py-4"
                        style={{ width: containerWidth || "100vw", overflow: "hidden" }}>
                        {renderExpandedRow(row)}
                      </div>
                    </td>
                  </tr>
                );
              }
              return rows;
            })}
          </tbody>
        </table>
      </HorizontalScrollArea>
    );
  };

  const renderPagination = () => {
    if (!pagination) return null;

    const { page, totalPages, total, pageSize, onPageChange, onPageSizeChange, showingText } =
      pagination;
    const tp = totalPages || 1;
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(tp, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    const pageNumbers = [];
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    const showStartEllipsis = start > 1;
    const showEndEllipsis = end < tp;

    const pageSizeOptions = [5, 10, 15, 20, 25, 50, 100];

    return (
      <div className="px-4 py-3 border-t border-border bg-muted/30 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          {onPageSizeChange && (
            <div
              role="group"
              aria-label={t("common.rowsPerPage", { defaultValue: "Rows per page" })}
              className="flex items-center gap-2 text-sm text-muted-foreground">
              <span aria-hidden="true">Show</span>
              <Combobox
                options={pageSizeOptions.map((opt) => ({ value: String(opt), label: String(opt) }))}
                value={String(pageSize || 10)}
                onChange={(v) => onPageSizeChange(Number(v))}
                placeholder="10"
                searchPlaceholder="Cari..."
              />
              <span aria-hidden="true">entries</span>
            </div>
          )}
          <span className="text-sm text-muted-foreground">
            {showingText || `Menampilkan 1-${data.length} dari ${total || data.length}`}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label={t("common.firstPage")}
            className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors">
            <ChevronsLeft size={14} />
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={t("common.previousPage")}
            className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors">
            <ChevronLeft size={14} />
          </button>
          {showStartEllipsis && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
                1
              </button>
              <span className="w-9 h-9 flex items-center justify-center text-muted-foreground text-xs select-none">
                ...
              </span>
            </>
          )}
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={cn(
                "w-9 h-9 flex items-center justify-center border rounded-lg text-sm font-medium transition-colors",
                pageNum === page
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}>
              {pageNum}
            </button>
          ))}
          {showEndEllipsis && (
            <>
              <span className="w-9 h-9 flex items-center justify-center text-muted-foreground text-xs select-none">
                ...
              </span>
              <button
                onClick={() => onPageChange(tp)}
                className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
                {tp}
              </button>
            </>
          )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= tp}
            aria-label={t("common.nextPage")}
            className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors">
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => onPageChange(tp)}
            disabled={page >= tp}
            aria-label={t("common.lastPage")}
            className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors">
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "bg-card rounded-xl shadow-sm border border-border overflow-hidden",
        containerClassName
      )}>
      {toolbar && <div className="p-4 border-b border-border bg-muted/30">{toolbar}</div>}
      {legendItems.length > 0 && <ActionLegend items={legendItems} />}

      <div className="relative">
        {isLoading ? (
          <HorizontalScrollArea>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  {allColumns.map((col, i) => (
                    <th
                      key={i}
                      ref={(el) => {
                        stickyThRefs.current.set(i, el);
                      }}
                      style={getCellStyle(col, i)}
                      className={cn(
                        "px-6 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.stickyRight &&
                          "sticky right-0 bg-card shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]",
                        col.stickyLeft &&
                          "sticky left-0 bg-card shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] z-10",
                        col.hideOn && `hidden ${col.hideOn}:table-cell`
                      )}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {Array.from({ length: 6 }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {allColumns.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        className={cn(
                          "px-6 py-4 text-center",
                          col.align === "right" && "text-right",
                          col.stickyRight &&
                            "sticky right-0 bg-card shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]",
                          col.stickyLeft &&
                            "sticky left-0 bg-card shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] z-10",
                          col.hideOn && `hidden ${col.hideOn}:table-cell`,
                          col.className
                        )}>
                        <Skeleton className={cn("h-4", colIdx === 0 ? "w-24" : "w-32")} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollArea>
        ) : (
          renderTable()
        )}
      </div>

      {selectedIds.length > 0 && bulkActions && (
        <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-t border-border">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2">
            {bulkActions(selectedIds, () => onSelectionChange([]))}
          </div>
        </div>
      )}

      {pagination && renderPagination()}
      {legendItems.length > 0 && <TableActionLegend items={legendItems} className="m-4" />}
    </div>
  );
};

export default DataTable;
