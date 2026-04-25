import { Button } from "./ui/button";
import { Card } from "./ui/card";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  onClose: () => void;
};

export const ConfirmModal = ({ open, title, description, confirmText, onConfirm, onClose }: ConfirmModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog">
      <Card className="modal-card">
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Отменить
          </Button>
          <Button type="button" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
};
