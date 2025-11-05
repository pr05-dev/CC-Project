import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Phone } from "lucide-react"

interface CallerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CallerModal({ isOpen, onClose }: CallerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Caller Feature
          </DialogTitle>
        </DialogHeader>
        <div className="text-center py-8">
          <Phone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2"> Your call will be connected within 2-3 minutes.  </h3>
          <p className="text-muted-foreground">We are currently experiencing high call volume.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
