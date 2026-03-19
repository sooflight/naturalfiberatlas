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
    <div className="absolute blur-[7.272px] h-[446.6px] left-[-15.24px] opacity-60 rounded-[14px] top-[-20.32px] w-[335.5px]" data-name="img">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[14px] size-full" src={imgImg1} />
    </div>
  );
}

function Div() {
  return <div className="absolute bg-[rgba(0,0,0,0.02)] h-[406.302px] left-0 rounded-[14px] top-0 w-[304.727px]" data-name="div" />;
}

function Div1() {
  return <div className="absolute h-[406.302px] left-0 rounded-[14px] top-0 w-[304.727px]" data-name="div" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 304.73 406.3\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(0 -31.733 -23.8 0 152.36 162.52)\\'><stop stop-color=\\'rgba(0,0,0,0)\\' offset=\\'0.3\\'/><stop stop-color=\\'rgba(0,0,0,0.2)\\' offset=\\'1\\'/></radialGradient></defs></svg>')" }} />;
}

function Div2() {
  return <div className="absolute h-[406.302px] left-0 opacity-4 rounded-[14px] top-0 w-[304.727px]" data-name="div" />;
}

function Span() {
  return (
    <div className="h-[25.592px] relative shrink-0 w-[274.258px]" data-name="span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Pica:Regular',sans-serif] leading-[25.596px] left-0 not-italic text-[36.566px] text-[rgba(193,127,62,0.2)] top-[-0.58px] tracking-[1.8283px] whitespace-nowrap">“</p>
      </div>
    </div>
  );
}

function P() {
  return (
    <div className="h-[89.746px] overflow-clip relative shrink-0 w-full" data-name="p">
      <p className="absolute font-['Pica:Italic',sans-serif] leading-[17.948px] left-0 not-italic text-[11.579px] text-[rgba(255,255,255,0.85)] top-[-0.33px] tracking-[0.96px] w-[234px]">Adobe is the most democratic of all building materials. It belongs to no patent, no corporation, no nation. It belongs to the earth, and to whoever kneels down to shape it.</p>
    </div>
  );
}

function Blockquote() {
  return (
    <div className="h-[89.746px] relative shrink-0 w-[274.258px]" data-name="blockquote">
      <div aria-hidden="true" className="absolute border-[rgba(193,127,62,0.4)] border-l-[1.667px] border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pl-[13.854px] relative size-full">
        <P />
      </div>
    </div>
  );
}

function Container3() {
  return <div className="bg-[rgba(193,127,62,0.3)] h-[0.996px] shrink-0 w-[15.234px]" data-name="Container" />;
}

function Span1() {
  return (
    <div className="h-[10.059px] relative shrink-0 w-[239.277px]" data-name="span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Pica:Regular',sans-serif] leading-[10.056px] left-0 not-italic text-[6.704px] text-[rgba(193,127,62,0.6)] top-[-0.17px] tracking-[1.0056px] uppercase whitespace-nowrap">Hassan Fathy — Architecture for the Poor, 1973</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="h-[10.059px] relative shrink-0 w-[274.258px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[4.57px] items-center relative size-full">
        <Container3 />
        <Span1 />
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[274.258px]" data-name="Container">
      <div className="flex flex-col justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[12.187px] items-start justify-center pt-[7.611px] relative size-full">
          <Blockquote />
          <Container2 />
        </div>
      </div>
    </div>
  );
}

function Span2() {
  return (
    <div className="h-[18.281px] relative shrink-0 w-[23.698px]" data-name="span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Pica:Regular',sans-serif] leading-[18.283px] left-0 not-italic text-[12.189px] text-[rgba(255,255,255,0.2)] top-[-0.33px] tracking-[4.8755px] whitespace-nowrap">···</p>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="h-[22.852px] relative shrink-0 w-[274.258px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Span2 />
      </div>
    </div>
  );
}

function Div3() {
  return (
    <div className="absolute content-stretch flex flex-col h-[406.302px] items-start left-0 pl-[15.234px] py-[15.234px] top-0 w-[304.727px]" data-name="div">
      <Span />
      <Container1 />
      <Container4 />
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

function Container5() {
  return <div className="absolute blur-[0.5px] h-[406.302px] left-0 opacity-53 rounded-[14px] top-0 w-[304.727px]" data-name="Container" />;
}

export default function Container() {
  return (
    <div className="relative size-full" data-name="Container">
      <Img />
      <Tag />
      <Container5 />
    </div>
  );
}