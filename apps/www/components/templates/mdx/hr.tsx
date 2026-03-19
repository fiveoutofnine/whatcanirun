const Hr: React.FC<React.HTMLAttributes<HTMLHRElement>> = (props) => {
  return (
    <hr
      className="my-6 h-px w-full rounded-full border-[0.5px] border-gray-6 md:my-8"
      role="separator"
      aria-hidden
      {...props}
    />
  );
};

export default Hr;
