import TravellerRow from './TravellerRow';

const TravellerSection = ({ title, travellers, touched, showAll, errors, onChange, onBlur }) => (
  <section className="mb-6" aria-label={title}>
    <h2 className="text-xl font-semibold text-earth-800 mb-3">{title}</h2>
    <div className="space-y-3">
      {travellers.map((traveller, index) => (
        <TravellerRow
          key={traveller.id}
          number={index + 1}
          traveller={traveller}
          touched={touched[traveller.id] || {}}
          showAll={showAll}
          errors={errors[traveller.id] || {}}
          onChange={onChange}
          onBlur={(field) => onBlur(traveller.id, field)}
        />
      ))}
    </div>
  </section>
);

export default TravellerSection;