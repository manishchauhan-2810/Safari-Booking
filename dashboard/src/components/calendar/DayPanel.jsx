import { useDaySlots } from "../../api/admin";
import { formatLong } from "../../utils/date";
import Modal from "../Modal";
import Spinner from "../Spinner";
import SlotRow from "./SlotRow";

const DayPanel = ({ date, vehicle, zone, today, onClose }) => {
  const { data, isLoading, isError, error, refetch } = useDaySlots(date, vehicle, zone);
  const past = date < today;

  return (
    <Modal title={`${formatLong(date)} · ${vehicle === "jeep" ? "Jeep" : "Canter"}`} onClose={onClose} drawer>
      {past && <p className="mb-3 rounded bg-earth-100 p-2 text-sm text-earth-700">This date is in the past, so it cannot be edited.</p>}
      {isLoading && <Spinner />}
      {isError && (
        <p className="text-sm text-red-600">
          {error.message}{" "}
          <button type="button" className="underline" onClick={() => refetch()}>Retry</button>
        </p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-earth-600">No slots exist for this date yet. Use "Bulk update" to create them.</p>
      )}
      {data && (
        <ul className="space-y-3">
          {data.map((s) => (
            <SlotRow key={`${s._id}-${s.totalUnits}-${s.isOpen}`} slot={s} readOnly={past} />
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default DayPanel;