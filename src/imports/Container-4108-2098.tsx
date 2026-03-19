import svgPaths from "./svg-msoc0dq2r4";
import imgImg from "figma:asset/e762c457e576e7641768affd579e58af07b4b4ad.png";
import imgImg1 from "figma:asset/f9a22623169994371032b890ed54d8d8f068ed52.png";

function Img() {
  return (
    <div className="absolute blur-[50px] h-[503.802px] left-[-36.56px] opacity-18 rounded-[16px] top-[-48.75px] w-[377.852px]" data-name="img">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[16px] size-full" src={imgImg} />
    </div>
  );
}

function Img1() {
  return (
    <div className="absolute blur-[7.544px] h-[446.6px] left-[-15.24px] opacity-60 rounded-[14px] top-[-20.32px] w-[335.5px]" data-name="img">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[14px] size-full" src={imgImg1} />
    </div>
  );
}

function Div() {
  return <div className="absolute bg-[rgba(0,0,0,0.03)] h-[406.302px] left-0 rounded-[14px] top-0 w-[304.727px]" data-name="div" />;
}

function Div1() {
  return <div className="absolute h-[406.302px] left-0 rounded-[14px] top-0 w-[304.727px]" data-name="div" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 304.73 406.3\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(0 -31.733 -23.8 0 152.36 162.52)\\'><stop stop-color=\\'rgba(0,0,0,0)\\' offset=\\'0.3\\'/><stop stop-color=\\'rgba(0,0,0,0.2)\\' offset=\\'1\\'/></radialGradient></defs></svg>')" }} />;
}

function Div2() {
  return <div className="absolute h-[406.302px] left-0 opacity-4 rounded-[14px] top-0 w-[304.727px]" data-name="div" />;
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[10.996px]" data-name="Icon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.9961 10.9961">
        <g clipPath="url(#clip0_4108_1657)" id="Icon">
          <path d={svgPaths.p16b50ad0} id="Vector" stroke="var(--stroke-0, #C17F3E)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" strokeWidth="0.916341" />
          <path d="M5.49805 10.0798V5.49805" id="Vector_2" stroke="var(--stroke-0, #C17F3E)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" strokeWidth="0.916341" />
          <path d={svgPaths.p35c51e60} id="Vector_3" stroke="var(--stroke-0, #C17F3E)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" strokeWidth="0.916341" />
          <path d={svgPaths.p7765ac0} id="Vector_4" stroke="var(--stroke-0, #C17F3E)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" strokeWidth="0.916341" />
        </g>
        <defs>
          <clipPath id="clip0_4108_1657">
            <rect fill="white" height="10.9961" width="10.9961" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Span() {
  return (
    <div className="h-[12.799px] relative shrink-0 w-[114.492px]" data-name="span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Pica:Regular',sans-serif] leading-[12.798px] left-0 not-italic text-[8.532px] text-white top-[-0.75px] tracking-[1.7064px] uppercase whitespace-nowrap">{`Materials & Cost`}</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[12.799px] relative shrink-0 w-[274.258px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[3.047px] items-center relative size-full">
        <Icon />
        <Span />
      </div>
    </div>
  );
}

function ItemIcon() {
  return (
    <div className="relative shrink-0 size-[10.996px]" data-name="item.icon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.9961 10.9961">
        <g clipPath="url(#clip0_4108_1667)" id="item.icon">
          <path d="M5.49805 0.916341V10.0798" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="0.916341" />
          <path d={svgPaths.p31c8c4d8} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="0.916341" />
        </g>
        <defs>
          <clipPath id="clip0_4108_1667">
            <rect fill="white" height="10.9961" width="10.9961" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Span1() {
  return (
    <div className="h-[12.799px] relative shrink-0 w-[68.971px]" data-name="span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[12.798px] left-0 not-italic text-[8.532px] text-[rgba(255,255,255,0.5)] top-[-1.17px] tracking-[1.2798px] uppercase whitespace-nowrap">Cost Range</p>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex gap-[3.047px] h-[12.799px] items-center relative shrink-0 w-full" data-name="Container">
      <ItemIcon />
      <Span1 />
    </div>
  );
}

function Span2() {
  return (
    <div className="h-[25.137px] relative shrink-0 w-full" data-name="span">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[25.139px] left-0 not-italic text-[16.76px] text-white top-[-0.92px] whitespace-nowrap">$30 - $90 / m²</p>
    </div>
  );
}

function Container3() {
  return (
    <div className="h-[39.935px] relative shrink-0 w-[274.258px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[1.999px] items-start relative size-full">
        <Container4 />
        <Span2 />
      </div>
    </div>
  );
}

function Container6() {
  return <div className="absolute bg-[rgba(255,255,255,0.06)] h-[0.996px] left-0 top-0 w-[274.258px]" data-name="Container" />;
}

function ItemIcon1() {
  return (
    <div className="relative shrink-0 size-[10.996px]" data-name="item.icon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.9961 10.9961">
        <g clipPath="url(#clip0_4108_1651)" id="item.icon">
          <path d={svgPaths.p16b50ad0} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="0.916341" />
          <path d="M5.49805 10.0798V5.49805" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="0.916341" />
          <path d={svgPaths.p35c51e60} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="0.916341" />
          <path d={svgPaths.p7765ac0} id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="0.916341" />
        </g>
        <defs>
          <clipPath id="clip0_4108_1651">
            <rect fill="white" height="10.9961" width="10.9961" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Span3() {
  return (
    <div className="h-[12.799px] relative shrink-0 w-[93.945px]" data-name="span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[12.798px] left-0 not-italic text-[8.532px] text-[rgba(255,255,255,0.5)] top-[-1.17px] tracking-[1.2798px] uppercase whitespace-nowrap">Wall Thickness</p>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="absolute content-stretch flex gap-[3.047px] h-[12.799px] items-center left-0 top-[13.18px] w-[274.258px]" data-name="Container">
      <ItemIcon1 />
      <Span3 />
    </div>
  );
}

function Span4() {
  return (
    <div className="absolute h-[25.137px] left-0 top-[27.98px] w-[274.258px]" data-name="span">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[25.139px] left-0 not-italic text-[16.76px] text-white top-[-0.92px] whitespace-nowrap">250-450 mm</p>
    </div>
  );
}

function Container5() {
  return (
    <div className="h-[53.118px] relative shrink-0 w-[274.258px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Container6 />
        <Container7 />
        <Span4 />
      </div>
    </div>
  );
}

function Container9() {
  return <div className="absolute bg-[rgba(255,255,255,0.06)] h-[0.996px] left-0 top-0 w-[274.258px]" data-name="Container" />;
}

function ItemIcon2() {
  return (
    <div className="relative shrink-0 size-[10.996px]" data-name="item.icon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.9961 10.9961">
        <g clipPath="url(#clip0_4108_1721)" id="item.icon">
          <path d={svgPaths.p267ab400} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="0.916341" />
          <path d={svgPaths.p3db71a80} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="0.916341" />
        </g>
        <defs>
          <clipPath id="clip0_4108_1721">
            <rect fill="white" height="10.9961" width="10.9961" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Span5() {
  return (
    <div className="h-[12.799px] relative shrink-0 w-[61.302px]" data-name="span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[12.798px] left-0 not-italic text-[8.532px] text-[rgba(255,255,255,0.5)] top-[-1.17px] tracking-[1.2798px] uppercase whitespace-nowrap">Build Time</p>
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="absolute content-stretch flex gap-[3.047px] h-[12.799px] items-center left-0 top-[13.18px] w-[274.258px]" data-name="Container">
      <ItemIcon2 />
      <Span5 />
    </div>
  );
}

function Span6() {
  return (
    <div className="absolute h-[25.137px] left-0 top-[27.98px] w-[274.258px]" data-name="span">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[25.139px] left-0 not-italic text-[16.76px] text-white top-[-0.92px] whitespace-nowrap">4-10 Weeks per building</p>
    </div>
  );
}

function Container8() {
  return (
    <div className="h-[53.118px] relative shrink-0 w-[274.258px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Container9 />
        <Container10 />
        <Span6 />
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[274.258px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[12.188px] items-start justify-center relative size-full">
        <Container3 />
        <Container5 />
        <Container8 />
      </div>
    </div>
  );
}

function Div3() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[7.617px] h-[406.302px] items-start left-0 pl-[15.234px] py-[15.234px] top-0 w-[304.727px]" data-name="div">
      <Container1 />
      <Container2 />
    </div>
  );
}

function Div4() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0)] h-[406.302px] left-0 rounded-[14px] top-0 w-[304.727px]" data-name="div">
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_-1px_1px_0px_rgba(0,0,0,0.1),inset_1px_0px_1px_0px_rgba(255,255,255,0.04),inset_-1px_0px_1px_0px_rgba(0,0,0,0.04)]" />
    </div>
  );
}

function Tag() {
  return (
    <div className="absolute h-[406.302px] left-0 overflow-clip rounded-[14px] top-0 w-[304.727px]" data-name="Tag">
      <Img1 />
      <Div />
      <Div1 />
      <Div2 />
      <Div3 />
      <Div4 />
    </div>
  );
}

function Container11() {
  return <div className="absolute blur-[0.5px] h-[406.302px] left-0 opacity-66 rounded-[14px] top-0 w-[304.727px]" data-name="Container" />;
}

export default function Container() {
  return (
    <div className="relative size-full" data-name="Container">
      <Img />
      <Tag />
      <Container11 />
    </div>
  );
}