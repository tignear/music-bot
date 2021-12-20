import { Readable } from "stream";

export interface HandleBase<Metadata> {
  fetchMetadata(): Promise<Metadata | null> | null;
  fetchStream(): Promise<Readable | null> | null;
}

export interface Resolver<Handle extends HandleBase<Metadata>, Metadata> {
  getHandle(key: string): Handle | null | Promise<Handle | null>;
}
