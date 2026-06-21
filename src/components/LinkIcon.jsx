import { Button } from "@/components/ui/button";

export default function LinkIcon({ href, label, icon }) {
  return (
    <Button asChild variant="ghost" size="icon">
      <a href={href} aria-label={label} dangerouslySetInnerHTML={{ __html: icon }} />
    </Button>
  );
}
