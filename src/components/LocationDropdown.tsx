"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";
import {
    searchCountries,
    searchStates,
    searchCities,
    getStatesForCountry,
    getCitiesForState,
} from "@/lib/locationData";

/* ──────────────────────────────────────────────────────────────
   Autocomplete Combobox – used for individual country/state/city
────────────────────────────────────────────────────────────── */
interface ComboboxProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    suggestions: string[];
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    /** Tailwind class string for the input element */
    inputClassName?: string;
    /** Tailwind class string for the label element */
    labelClassName?: string;
    /** Tailwind class string wrapping div */
    wrapperClassName?: string;
}

function LocationCombobox({
    label,
    value,
    onChange,
    suggestions,
    placeholder = "Type to search…",
    disabled = false,
    required = false,
    inputClassName = "",
    labelClassName = "",
    wrapperClassName = "",
}: ComboboxProps) {
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const wrapRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep internal query in sync when value changes externally
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Filter suggestions based on current query
    const filtered = query.trim()
        ? suggestions.filter((s) =>
            s.toLowerCase().includes(query.toLowerCase())
        )
        : suggestions;

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
                // If user typed something not in the list, keep it as-is
                if (!suggestions.some(s => s.toLowerCase() === query.toLowerCase())) {
                    // Allow free text
                }
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [query, suggestions]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlighted >= 0 && listRef.current) {
            const item = listRef.current.children[highlighted] as HTMLLIElement;
            item?.scrollIntoView({ block: "nearest" });
        }
    }, [highlighted]);

    const handleSelect = (val: string) => {
        setQuery(val);
        onChange(val);
        setOpen(false);
        setHighlighted(-1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setQuery(v);
        onChange(v);
        setOpen(true);
        setHighlighted(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open) {
            if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((h: number) => Math.min(h + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h: number) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlighted >= 0 && filtered[highlighted]) {
                handleSelect(filtered[highlighted]);
            } else {
                setOpen(false);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <div ref={wrapRef} className={`relative ${wrapperClassName}`}>
            {label && (
                <label
                    className={
                        labelClassName ||
                        "block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 mb-2"
                    }
                >
                    {label}
                    {required && <span className="text-primary ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={disabled ? "Select country first" : placeholder}
                    disabled={disabled}
                    required={required}
                    autoComplete="off"
                    className={
                        inputClassName ||
                        "w-full bg-background border border-border rounded-xl px-5 py-3.5 pr-10 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    }
                />
                {/* Chevron icon */}
                <div
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground transition-transform duration-200"
                    style={{ transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)` }}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Dropdown list */}
            {open && filtered.length > 0 && (
                <ul
                    ref={listRef}
                    className="absolute z-[9999] w-full mt-1.5 rounded-xl shadow-2xl max-h-52 overflow-y-auto bg-background border-[1.5px] border-border"
                    role="listbox"
                >
                    {filtered.map((item, idx) => (
                        <li
                            key={item}
                            role="option"
                            aria-selected={idx === highlighted}
                            onMouseDown={() => handleSelect(item)}
                            onMouseEnter={() => setHighlighted(idx)}
                            className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors duration-100 ${idx === highlighted ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                                } ${idx === 0 ? "rounded-t-xl" : ""} ${idx === filtered.length - 1 ? "rounded-b-xl" : ""}`}
                        >
                            {highlightMatch(item, query)}
                        </li>
                    ))}
                </ul>
            )}
            {open && query.trim() && filtered.length === 0 && (
                <div
                    className="absolute z-[9999] w-full mt-1.5 rounded-xl shadow-2xl px-4 py-3 text-sm font-medium bg-background border-[1.5px] border-border text-muted-foreground"
                >
                    No results for &quot;{query}&quot;
                </div>
            )}
        </div>
    );
}

/** Bold the matched substring in the suggestion */
function highlightMatch(text: string, query: string): React.ReactNode | string {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <strong className="font-black">{text.slice(idx, idx + query.length)}</strong>
            {text.slice(idx + query.length)}
        </>
    );
}

/* ──────────────────────────────────────────────────────────────
   LocationSelector – Country + State + City linked together
────────────────────────────────────────────────────────────── */
export interface LocationValues {
    country: string;
    state: string;
    city: string;
}

interface LocationSelectorProps {
    values: LocationValues;
    onChange: (values: LocationValues) => void;
    /** CSS class for the grid wrapper, e.g. "grid grid-cols-1 md:grid-cols-3 gap-8" */
    gridClassName?: string;
    /** Pass variant="candidate" to use the candidate dashboard style inputs */
    variant?: "default" | "candidate" | "filter";
}

export function LocationSelector({
    values,
    onChange,
    gridClassName = "grid grid-cols-1 md:grid-cols-3 gap-8",
    variant = "default",
}: LocationSelectorProps) {
    const allCountries = searchCountries("");
    const stateList = values.country ? getStatesForCountry(values.country) : [];
    const cityList =
        values.country && values.state
            ? getCitiesForState(values.country, values.state)
            : [];

    const handleCountryChange = (val: string) => {
        onChange({ country: val, state: "", city: "" });
    };

    const handleStateChange = (val: string) => {
        onChange({ ...values, state: val, city: "" });
    };

    const handleCityChange = (val: string) => {
        onChange({ ...values, city: val });
    };

    // Style variants
    const inputCls =
        variant === "candidate"
            ? "w-full bg-background border border border-border rounded-2xl px-6 py-4 pr-10 text-foreground placeholder-muted-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
            : variant === "filter"
                ? "w-full bg-muted/50 border border-border rounded-lg px-3.5 h-11 pr-8 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                : "w-full bg-background border border-border rounded-xl px-5 py-3.5 pr-10 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed";

    const labelCls =
        variant === "candidate"
            ? "block text-xs font-black text-muted-foreground mb-2 uppercase tracking-widest"
            : variant === "filter"
                ? "block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1.5"
                : "block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 mb-2";

    return (
        <div className={gridClassName}>
            <LocationCombobox
                label="Country"
                value={values.country}
                onChange={handleCountryChange}
                suggestions={allCountries}
                placeholder="e.g. India"
                required
                inputClassName={inputCls}
                labelClassName={labelCls}
            />
            <LocationCombobox
                label="State / Province"
                value={values.state}
                onChange={handleStateChange}
                suggestions={stateList}
                placeholder={values.country ? "Select state" : "Select country first"}
                disabled={!values.country}
                inputClassName={inputCls}
                labelClassName={labelCls}
            />
            <LocationCombobox
                label="City"
                value={values.city}
                onChange={handleCityChange}
                suggestions={cityList}
                placeholder={values.state ? "Select city" : "Select state first"}
                disabled={!values.state}
                inputClassName={inputCls}
                labelClassName={labelCls}
            />
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
   Single location search box (for filter panels)
   Shows a flat autocomplete searching city / state / country
────────────────────────────────────────────────────────────── */
import { WORLD_LOCATION_DATA } from "@/lib/locationData";

interface LocationSearchProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    inputClassName?: string;
    labelClassName?: string;
    label?: string;
    wrapperClassName?: string;
}

export function LocationSearchBox({
    value,
    onChange,
    placeholder = "City, State or Country…",
    inputClassName,
    labelClassName,
    label,
    wrapperClassName,
}: LocationSearchProps) {
    // Build a flat list of all searchable location strings
    const allLocations: string[] = [];
    for (const entry of WORLD_LOCATION_DATA) {
        allLocations.push(entry.country);
        for (const state of entry.states) {
            allLocations.push(state.name);
            for (const city of state.cities) {
                if (!allLocations.includes(city)) {
                    allLocations.push(city);
                }
            }
        }
    }

    const filtered = value.trim()
        ? allLocations
            .filter((l) => l.toLowerCase().includes(value.toLowerCase()))
            .slice(0, 20)
        : [];

    return (
        <LocationCombobox
            label={label || ""}
            value={value}
            onChange={onChange}
            suggestions={filtered}
            placeholder={placeholder}
            inputClassName={
                inputClassName ||
                "w-full bg-muted/50 border border-border rounded-lg px-3.5 h-11 pr-8 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary transition-all text-sm font-medium"
            }
            labelClassName={
                labelClassName ||
                "block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1.5"
            }
            wrapperClassName={wrapperClassName}
        />
    );
}

export default LocationCombobox;
