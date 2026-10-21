import Modal from "./Modal";
import { Button } from "./ui/Button";

const ConfirmDialog = ({ title, message, confirmLabel = "Confirm", danger = false, loading = false, onConfirm, onCancel }) => (
  <Modal title={title} onClose={onCancel} size="sm">
    <p className="text-sm text-earth-800">{message}</p>
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </Modal>
);

export default ConfirmDialog;