import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type OfferingRecord = CollectionEntry<'offerings'>['data'];
export type ProductRecord = CollectionEntry<'products'>['data'];
export type FaqRecord = CollectionEntry<'faqs'>['data'];
export type GlobalSettings = CollectionEntry<'global'>['data'];
export type LegalRecord = CollectionEntry<'legal'>['data'];
export type PersonRecord = CollectionEntry<'people'>['data'];
export type PartnerRecord = CollectionEntry<'partners'>['data'];

function bySortOrder<T extends { data: { sortOrder: number } }>(left: T, right: T) {
  return left.data.sortOrder - right.data.sortOrder;
}

export async function getOfferings(): Promise<OfferingRecord[]> {
  const entries = await getCollection('offerings');
  return entries.sort(bySortOrder).map((entry) => entry.data);
}

export async function getProducts(): Promise<ProductRecord[]> {
  const entries = await getCollection('products');
  return entries.sort(bySortOrder).map((entry) => entry.data);
}

export async function getProduct(slug: string): Promise<ProductRecord | undefined> {
  const products = await getProducts();
  return products.find((product) => product.slug === slug);
}

export async function getFaqs(category?: FaqRecord['category']): Promise<FaqRecord[]> {
  const entries = await getCollection('faqs');
  return entries
    .filter((entry) => !category || entry.data.category === category)
    .sort(bySortOrder)
    .map((entry) => entry.data);
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const entries = await getCollection('global');
  const settings = entries.at(0);
  if (entries.length !== 1 || !settings) {
    throw new Error(`Expected exactly one global settings record; found ${entries.length}.`);
  }
  return settings.data;
}

export async function getLegalDocument(slug: LegalRecord['slug']): Promise<LegalRecord | undefined> {
  const entries = await getCollection('legal');
  return entries.find((entry) => entry.data.slug === slug)?.data;
}

/** Only people whose publication consent is recorded reach the public page. */
export async function getPeople(group?: PersonRecord['group']): Promise<PersonRecord[]> {
  const entries = await getCollection('people');
  return entries
    .filter((entry) => entry.data.publicationStatus === 'approved')
    .filter((entry) => !group || entry.data.group === group)
    .sort(bySortOrder)
    .map((entry) => entry.data);
}

export async function getPartners(): Promise<PartnerRecord[]> {
  const entries = await getCollection('partners');
  return entries.sort(bySortOrder).map((entry) => entry.data);
}
