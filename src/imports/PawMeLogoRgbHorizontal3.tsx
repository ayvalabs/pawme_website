import svgPaths from "./svg-r5jekye5fw";

function Group() {
  return (
    <div className="absolute inset-[18.75%_73.39%_18.75%_6.13%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 500 500">
        <g id="Group">
          <path d={svgPaths.p1dcc9480} fill="var(--fill-0, #00CE7C)" id="Vector" />
          <path d={svgPaths.p1f47d6f2} fill="var(--fill-0, #00CE7C)" id="Vector_2" />
          <path d={svgPaths.p2051a000} fill="var(--fill-0, #00CE7C)" id="Vector_3" />
          <path d={svgPaths.p151d2200} fill="var(--fill-0, #00CE7C)" id="Vector_4" />
          <path d={svgPaths.p50ba00} fill="var(--fill-0, #00CE7C)" id="Vector_5" />
        </g>
      </svg>
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute inset-[28.24%_6.13%_27.7%_29.65%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1568.28 352.53">
        <g id="Group">
          <path d={svgPaths.p3dc12f00} fill="var(--fill-0, #00CE7C)" id="Vector" />
          <path d={svgPaths.p32187600} fill="var(--fill-0, #00CE7C)" id="Vector_2" />
          <path d={svgPaths.p2f23f0e0} fill="var(--fill-0, #00CE7C)" id="Vector_3" />
          <path d={svgPaths.p122f5472} fill="var(--fill-0, #00CE7C)" id="Vector_4" />
          <path d={svgPaths.p299285f0} fill="var(--fill-0, #00CE7C)" id="Vector_5" />
        </g>
      </svg>
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute contents inset-[18.75%_6.13%]" data-name="Group">
      <Group />
      <Group1 />
    </div>
  );
}

export default function PawMeLogoRgbHorizontal() {
  return (
    <div className="relative size-full" data-name="PawMe-Logo-RGB_Horizontal 3">
      <Group2 />
    </div>
  );
}