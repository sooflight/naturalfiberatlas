/**
 * Curated gallery images for the Natural Fiber Atlas.
 * Sources: Cloudinary CDN (primary), Openverse, Wikimedia, Pexels.
 * Each fiber ID maps to an array of image URLs for its gallery plates.
 */

export interface GalleryImageEntry {
  url: string;
  title?: string;
  attribution?: string;
  orientation?: "portrait" | "landscape";
}

function img(
  url: string,
  title?: string,
  attribution?: string,
  orientation?: "portrait" | "landscape",
): GalleryImageEntry {
  return { url, title, attribution, orientation };
}

export const galleryData: Record<string, GalleryImageEntry[]> = {
  /* ── Bast Fibers ── */
  hemp: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619082/atlas/rki8swhrri03gmtjacrm.jpg", "Hemp fiber close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619069/atlas/o5brgx3sqnnwbd7re1ic.jpg", "Raw hemp stalks", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619070/atlas/dnpcv9iks9nn64cpcbuh.jpg", "Hemp processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771633173/atlas/mlapck15btekiyb9wwmi.jpg", "Hemp field"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619073/atlas/yta1tistuaszfx9peetu.jpg", "Hemp fiber bundle"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619075/atlas/jdsr2nwfbfgyfimudrff.jpg", "Hemp rope texture"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619067/atlas/uktcb2if8u7z0eoaqdrz.jpg", "Hemp cultivation"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771704609/atlas/ipu8hfghkme5ivqldwgf.jpg", "Filipino woman weaving hemp fiber", "Openverse", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771704611/atlas/z14xiyt0nunef3yrcgeb.jpg", "Assorting Manila hemp fiber", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771704612/atlas/xwqgbtwyq3s9t4hdcwct.jpg", "Bundles of Manila hemp fiber", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619080/atlas/uhtds8mgv6pw3fcgetvd.png", "Hemp uses diagram"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771704613/atlas/tstnpra6vhhwmbmxp2pt.jpg", "Manila hemp bundles for market", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771704615/atlas/qcfwzrckokhwgwvbc01l.jpg", "Filipino rope factory, cleaning hemp", "Openverse"),
  ],

  jute: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619095/atlas/iwpky4ruxdodh64nldsc.jpg", "Jute fiber processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619097/atlas/ytnsyiolzlaesqw7r3os.jpg", "Raw jute fibers"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619092/atlas/nepjatyfyca2jmoxycdz.jpg", "Jute cultivation"),
  ],

  "flax-linen": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771539245/vpznodascnuqzj8xptd8.jpg", "Flax linen fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619089/atlas/gaggmu9ccig2plu26vue.jpg", "Flax plant field"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619086/atlas/aiwfp2jfeixwvm88za9t.jpg", "Flax fiber extraction"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619085/atlas/c5bij9fpoikcxwuppbjh.jpg", "Linen textile weave"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619091/atlas/semplekcxck2jlsjfxpr.jpg", "Flax seed pod"),
  ],

  "organic-cotton": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771660007/atlas/pmkztjyyr8keuydhjssm.jpg", "Cotton boll close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771659941/atlas/hrgf79vpomknr6inlwdq.jpg", "Organic cotton field"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_23,y_17,w_1036,h_777/v1771537794/tui0czwsd4oxaijakgjc.jpg", "Cotton harvest"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771660006/atlas/mvbslovsxxugwegpoicw.jpg", "Cotton fiber detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619114/atlas/va8nncvnzc65qfgwco6n.jpg", "Cotton processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619112/atlas/axkjtbopklxq0zm9fvxv.jpg", "Cotton ginning"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771722544/atlas/oft4lmrqtez1m59vm4ec.jpg", "Gossypium hirsutum", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771660008/atlas/yanuymnwnlebqqfyvicd.jpg", "Cotton bolls on plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771660004/atlas/beoh4kfn3bvfwnihfknb.jpg", "Organic cotton fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771722542/atlas/hafsv5yualbb3ll565kh.jpg", "Upland cotton botanical illustration", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771722543/atlas/fcifbs3kwm9fzmj8df7a.jpg", "Dried upland cotton plant", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771722544/atlas/oaqqgzisdiexk6ubzbgh.jpg", "Cotton plant", "ChriKo, CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771660005/atlas/ih3flp0yphetbxnlxu2n.png", "Cotton fiber varieties"),
  ],

  silk: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771645646/atlas/fg2czrebuvxoinpqedtp.jpg", "Silk thread close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619261/atlas/yksbwtxethsok4bxsoix.jpg", "Silk cocoons"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619272/atlas/bwyoiumzmx5d2kqhvsnz.jpg", "Peace silk"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619274/atlas/u54xnyn30xhvcs7pgqxq.jpg", "Tussar silk"),
  ],

  bamboo: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619174/atlas/fru5la7c6aitgta2i5f8.jpg", "Bamboo grove"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619174/atlas/mbom8cy4rmsfosndtfop.jpg", "Bamboo fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619175/atlas/v3hdyhfhug91ajiey75m.jpg", "Bamboo textile"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619290/atlas/pjdkdgoxrrz5u2qwusdz.jpg", "Bamboo viscose"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771749992/atlas/jvnkfstlnqqeahamdog3.jpg", "Bamboo stalks"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771749994/atlas/jkjzi7ymzlfrt4ypwufb.jpg", "Bamboo forest"),
  ],

  wool: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619184/atlas/xbtkwreyjuogrzymhkib.jpg", "Raw sheep wool"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619186/atlas/drexoxrl6qgqm3uchmlg.jpg", "Wool fiber close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619187/atlas/emivlmjdqsk66u2qhji8.jpg", "Sheep shearing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771657863/atlas/gegjkntl1jdwbktwtxji.jpg", "Wool spinning"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619188/atlas/br5oyf2xfogdzeosru9s.jpg", "Merino wool"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619189/atlas/vhxmkgun6gmaeg6nzhbs.jpg", "Fine merino fleece"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619190/atlas/av8tbuy1pd3bkqf7nyd7.jpg", "Merino fiber detail"),
  ],

  coir: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771538775/lmgulrcokuc0ixdd40if.jpg", "Coir fiber bundle"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619179/atlas/gqmq3eb0thehhoxu7mkm.jpg", "Coconut husk processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771538716/qumlyrendrghvi76m1xr.jpg", "Coir rope"),
  ],

  sisal: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746447/atlas/suwdp1lxvsm5yvsydj4d.jpg", "Sisal fibers drying, Kenya", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_69,y_19,w_882,h_602/v1771746642/atlas/wglux5xuxrdvp3g7mu9u.jpg", "Sisal plant close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619146/atlas/yobmizwki6grlddpdlx4.jpg", "Sisal fiber texture"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746446/atlas/k7wtevjwuygt9xjmgdin.jpg", "Sisal plant leaves", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746449/atlas/k2nlicabre0aplxfxryj.jpg", "Sisal field", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746450/atlas/hfxf6by6kdtzjngaxxd3.jpg", "Sisal fields in Tanzania", "Joachim Huber, CC BY-SA 2.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746647/atlas/wnukb33o1lcsdri3e0wm.jpg", "Sisal fiber processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746652/atlas/smrxzs306mqx6ju5skt0.jpg", "Sisal in the wild"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746643/atlas/isqdqjlvfurctzsmq8ah.jpg", "Sisal plantation panorama", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746450/atlas/nnmdkm9ts6pkcx7zbpq6.jpg", "Boy spinning sisal, Java", "CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746451/atlas/sk5xadxhurp0lfjn5lnu.jpg", "Sisal factory processing", "CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746452/atlas/kirdzyrnubqqf71mdn0l.jpg", "Sisal drying, Brazil", "Acilondioliveira, CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_0,y_0,w_1200,h_743/v1771746453/atlas/dkad6lpurjbkvcb3prrl.webp", "Sisal rope weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746454/atlas/jvadpkc8baxjxxhanpbs.jpg", "Sisal cultivation, Tanganyika", "Public domain"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746644/atlas/o5txpwp1lufccesu6f0l.jpg", "Sisal fiber wholesale"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746645/atlas/haw0dg5j1txdrhfhqbhz.jpg", "Sisal fiber harvest"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746646/atlas/pqem8lpla3fcmyikbj4g.jpg", "Golden sisal fibers"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746646/atlas/pulythymckf9ibfqg8jm.jpg", "Sisal long fiber bundle", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746648/atlas/urbbnrrwd3jgzjp1f5kn.jpg", "Sisal fiber semi-combed", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746649/atlas/akhuxfbcnarziea7urds.jpg", "Sisal fibre close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746650/atlas/elh0zli5mdhhde50fftt.jpg", "Sisal natural fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746651/atlas/oro04ekjcn6nxuhyndis.jpg", "Sisal fiber processing overview"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771746649/atlas/lgxrgcbwc3vbtctj81xw.jpg", "Sisal weave texture"),
  ],

  ramie: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619101/atlas/zjnehkg1uphhf6reyrjx.jpg", "Ramie fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_0,y_0,w_790,h_755/v1771619103/atlas/oiiebhob1fuaethvjfhd.jpg", "Ramie plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619104/atlas/ximcswutj743kuvcxizg.jpg", "Ramie textile"),
  ],

  kapok: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723041/atlas/bymapkiz4ietts4t7eki.jpg", "Kapok fiber filling"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723035/atlas/n4eo2tcqe1tto3oazhsh.jpg", "Kapok seed pods"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723037/atlas/qzojfabdpwowzoywbhin.jpg", "Kapok fiber close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723043/atlas/axe5atqmtswjlujv6km6.jpg", "Kapok pillow filling"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723039/atlas/slelcrvpywztgc3pdil1.jpg", "Kapok tree"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723042/atlas/boqoj61dd5qwqdlszigi.jpg", "Kapok harvest"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771723038/atlas/zfkwgh49vec3smxgcbuz.jpg", "Kapok raw material"),
  ],

  pineapple: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619124/atlas/w1yt5po5mcws4zgrtjfs.png", "Piña fiber extraction"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619126/atlas/z6dp7jzl5zqiy3ggsluu.jpg", "Piña cloth weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619132/atlas/dauat7oh467mzocnxz9n.jpg", "Pineapple leaf fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619133/atlas/qh0axevmwsjjnmj4ntpj.png", "Piña textile detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619142/atlas/z8mlybczh2qstlrcxmoz.jpg", "Barong Tagalog piña"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619129/atlas/blrg9dqpridqzw3umb2r.jpg", "Piña fiber threads"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619138/atlas/t2tpq3tenfdhswlttzos.jpg", "Piña fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619136/atlas/opt6kvnhf0uhalwdjqwb.png", "Piñatex leather alternative"),
  ],

  /* ── Animal / Protein Fibers ── */
  alpaca: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619205/atlas/olset8dyvyadkk9vqtzb.jpg", "Alpaca fleece"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619204/atlas/akmglkkhyxvb9ckffe2r.jpg", "Alpaca fiber detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619207/atlas/e5nfrcm9kb3qqnffddqa.jpg", "Alpaca yarn"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619208/atlas/spgrxiqfiz6gcxdvqmk8.jpg", "Huacaya alpaca"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619211/atlas/eohp2eik3xfzpe5h7vzz.jpg", "Suri alpaca locks"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619213/atlas/edblonehrotg5u6ckebk.jpg", "Suri alpaca fiber"),
  ],

  cashmere: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619218/atlas/wwsaqii8lm9hdfzjgddw.jpg", "Cashmere fiber"),
  ],

  nettle: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771714087/atlas/vm96tfgwy69otsdf9ilp.jpg", "Nettle plant", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_13,y_12,w_604,h_810/v1771828909/atlas/ndamslbpawqsynq8fzah.jpg", "Nettle fiber extraction", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828910/atlas/yhwt0izk9bfiypxoojib.jpg", "Nettle fibers unprocessed"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828910/atlas/lltjrxybhanbsu5e4142.jpg", "Himalayan nettle shawl"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828911/atlas/w4udqri9siwbq1saj1xj.jpg", "Hand spun nettle yarn"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828912/atlas/qdy2z5lliiaw3zwwtemw.jpg", "Combed nettle fibers"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828913/atlas/xgvvsviy1w7f2tqz1q4g.jpg", "Fine nettle fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828914/atlas/vr3xay6zlrh6fgcq2oaz.webp", "Bast fibres nettle"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828914/atlas/qxhixvgykto5oiit7lys.jpg", "Nettle natural background"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828915/atlas/putehpjhtofvsopcamqm.jpg", "Stinging nettle plant isolated", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828916/atlas/icruy7klvxqozczz4vfi.jpg", "Rural nettles", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828917/atlas/mpzb1fd0p8coaca1uptd.jpg", "Fresh nettle plants close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828918/atlas/rynjjzlzwnlwctloisvv.jpg", "Stinging nettle weed"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828919/atlas/vknwzfqxxxssdm4ogjcj.jpg", "Polystem stinging nettle", undefined, "portrait"),
  ],

  abaca: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748688/atlas/skeozdno1yhxzsqboxvc.jpg", "Abaca tree", "MarvinBikolano, CC BY-SA 4.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748686/atlas/k1t9swxpwlobsiqgrgmc.jpg", "Abaca fiber drying", "John Washington, CC BY-SA 4.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619154/atlas/ong9rnnwemjduqt92x2y.jpg", "Abaca fiber strands"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748683/atlas/x6y3ocyutjact1dq5y23.jpg", "Abaca sachsenleinen", "CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619148/atlas/ejoqyjpuabqk9l0wdao9.jpg", "Manila hemp rope"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619147/atlas/eu3b1ht6b5zmldipacqg.jpg", "Abaca processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619149/atlas/frtxfaemdegnw8myds5a.jpg", "Abaca weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619152/atlas/h5i9gzd6hr6uzwlyrfjc.jpg", "Abaca textile"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619181/atlas/wb7uhw68q6odzjpllgnw.jpg", "Abaca fiber detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748692/atlas/vpbfsp8muaiijobyrhsg.jpg", "Abaca fiber bundles", "MarvinBikolano, CC BY-SA 4.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748680/atlas/csmhwexzba8c9hwe0oby.jpg", "Abaca fiber (Manila Hemp)", "Openverse", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748682/atlas/r9y9bulw1mqptijriyuq.jpg", "Abaca sachsenleinen raw", "CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748681/atlas/z54sfyyhr9of2kgxuylc.jpg", "Filipino rope factory, combing fibers", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748684/atlas/l1uwfrj8vtlgfzfsqupl.jpg", "Assorting Manila hemp fiber", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748684/atlas/xj0aqirurdqirgcm6ifc.jpg", "Abaca sachsenleinen processed", "CC BY-SA 3.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748686/atlas/xmir9g9nrxfxpspbeyp3.jpg", "Stripping abaca tree", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748687/atlas/moqjcxlfpqxxpgf9124k.jpg", "Cleaning Manila hemp fiber", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748689/atlas/zae1ump5ic7y3kds7faa.jpg", "Hanging Manila hemp to dry", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748690/atlas/kzfhgk5a2cmg6izfs7vn.jpg", "Cleaning Manila hemp", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748690/atlas/uqdkqksjglk3nkxyhgbd.jpg", "Cutting down abaca tree", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748691/atlas/mwkrcslj7yrdqyvslod4.jpg", "Assorting Manila hemp grades", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748693/atlas/xgeg4i3oj2sazogeibn8.jpg", "Abaca fiber detail", "Openverse", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748693/atlas/fj9rxodkcsz09eewajsa.jpg", "Manila hemp bundle", "Openverse"),
  ],

  mohair: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619216/atlas/zcp45m47mrdgfn9w7k9w.png", "Mohair fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741088/atlas/vk0uskoicccdscrbgipu.jpg", "Angora goats", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741074/atlas/gads6lqyezgd0vosv39h.jpg", "Angora goat fleece", "Pexels", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_7,y_6,w_1010,h_669/v1771741074/atlas/disiefaywmksf4hp1occ.jpg", "Angora goat portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741077/atlas/cyns84qym5shzehdgjft.jpg", "Angora goat horns", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741078/atlas/a8fzlcvwx5eeutiwzkzb.jpg", "Quebec angora goat", "Erica Peterson, CC BY 2.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741077/atlas/sx88ey2dxemejpdha44s.jpg", "Angora goat", "Public domain"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741072/atlas/t0rfehhvu68pj0ynj8hd.jpg", "Angora goat herd", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741075/atlas/wn4rxgwlhzngztyvsjhw.jpg", "Angora goat fiber detail", "Public domain", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741076/atlas/jk5ifvg5yzylsyow5yqp.jpg", "Angora goat close-up", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741079/atlas/kt33cepkht3fr17xd1ck.jpg", "Angora goat in Norway", "Ernst Vikne, CC BY-SA 2.0", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741080/atlas/nuqqrtixu7k2moqdwyjg.jpg", "Angora goat in pen", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741081/atlas/rpqb4gwapwvpxoulvmbm.jpg", "Angora goat capra hircus", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741082/atlas/ysmirxigpprf2ncot4to.jpg", "Angora goats, not sheep", "Openverse", "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741083/atlas/rbojjyysl8ztrvxoknex.jpg", "Angora and brown goats", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741086/atlas/zpkzzedxngkkykpgw4ws.jpg", "Tiftik Keçisi Gravürü", "VEKAM, CC BY-NC-SA 4.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741087/atlas/sgbbsnntxtxw6x7s2vt5.jpg", "Serene angora goat", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741089/atlas/c9qnhcyy0eo09dy3lcw3.jpg", "Modern angora goat", "Public domain"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741092/atlas/iz21uvurpdk8vmo35huw.jpg", "Angora goats near Tuba City, ca.1900", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741095/atlas/k6yqklzbblggeolo6i8f.jpg", "Angora Goat capra hircus", "Drew Avery, CC BY 2.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741081/atlas/asaj547h6ukhwfxgc1h3.jpg", "Angora goat", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741088/atlas/gpj66qtu5c1c0knihpdw.jpg", "Angora goats near Berriedale", "sylvia duckworth, CC BY-SA 2.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741090/atlas/jdif7vqaeecmysf5fzep.jpg", "Angora goat in pasture", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741091/atlas/ijbwbmcfneyllujeymfs.jpg", "Angora goat close-up", "Pexels"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741092/atlas/wv0nvsdyelrpnrbcvgix.jpg", "Angora goat historical photo", "State Government Photographer, CC0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741093/atlas/uvijnbspdzxem4dj26st.jpg", "Wild Angora goat", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741094/atlas/ddh3qaxxx2glluywcgmp.jpg", "Angora goat portrait", "Unsplash"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741096/atlas/r9lndx7trkc2flykvkth.jpg", "Angora goat", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771741097/atlas/vsqvyzozjutb6yc5thrc.jpg", "Angora goat", "Openverse"),
  ],

  lyocell: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619283/atlas/poiednmozdgvjyebqe6h.jpg", "Lyocell fabric"),
  ],

  modal: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619281/atlas/arlz1b51vhdn3orb1ry3.jpg", "Modal fiber"),
  ],

  kenaf: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771656856/atlas/qnssqaxykqog9esauhqs.jpg", "Kenaf plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771656856/atlas/s1u4qj152zdt8zfg6pz5.jpg", "Kenaf fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_0,y_4,w_220,h_306/v1771656859/atlas/o5cbe7lspdiwnezlce4e.png", "Kenaf stalk cross-section", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771656914/atlas/t6eqe3odbw9rpwtwvyzp.jpg", "Kenaf field"),
  ],

  yak: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619253/atlas/epurwzsvlfws4fi3tez3.jpg", "Yak in highland pasture"),
  ],

  /* ── New fibers (with atlas-data.json coverage) ── */
  llama: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619222/atlas/w5twa1owfr4vkbvgzt18.jpg", "Llama portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619224/atlas/nm4v5g66tbrdp4zf0k0u.jpg", "Llama fleece"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619225/atlas/fbpd3d6i51zrt9zkv7uq.png", "Llama fiber processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619236/atlas/rnkhf5toocpqmxh8dy8v.jpg", "Llama in Andes"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619229/atlas/zqbjsnj9h7avivchhl7k.jpg", "Llama herd"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619239/atlas/shy6srrbdyexnkcajkb6.jpg", "Llama close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619242/atlas/gsck6jybgul3ygjlpvr1.jpg", "Llama wool"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619245/atlas/qfcgpckfqudsxyizrvhm.jpg", "Llama textile"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619247/atlas/hcnbosnu1qymrcaxqvug.jpg", "Andean llama"),
  ],

  bison: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619255/atlas/mplwe2qsjn0qjt2v1lqw.avif", "American bison"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619257/atlas/yqxympjgmhtejsmh9t07.avif", "Bison close-up"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815787/atlas/o14pdcea9t4mwbyecmd0.jpg", "Bison portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815780/atlas/e4jadrqo9z2ogkkhbse2.jpg", "The Mighty Bison"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815778/atlas/f2mxp0nhx0bzivd6jjgs.jpg", "Bison in snow"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815781/atlas/wtykvhinyujm68uddxz9.jpg", "Bison herd"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815782/atlas/bzwxqaau939lo6eg1adw.jpg", "Bison winter coat"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815783/atlas/g4cbfixwzj9ud3ngmpon.jpg", "Bison wildlife"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815784/atlas/pzmr1se3cqro3h8y6fzx.jpg", "Bison power"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815786/atlas/t60swdqkdchi8bvus1ls.jpg", "Bison power stance"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815788/atlas/lianyc1dggqipsgtjfy8.jpg", "American bison portrait", undefined, "portrait"),
  ],

  henequen: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619156/atlas/i9h3sb5psqmyvitcfh50.jpg", "Henequen fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619158/atlas/zg1mqfgqqlyxm5syt2fj.jpg", "Henequen plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619161/atlas/hmrxdmlpp2nldevlks3n.jpg", "Henequen cultivation"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619164/atlas/aychyppaxppjdd8czqmi.jpg", "Henequen processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619168/atlas/gt6m7x6y2pt8yr9d1hh5.jpg", "Henequen harvest"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619163/atlas/q7p14cyr9gnb9udc9eqv.jpg", "Henequen agave"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619166/atlas/us5s9zsnmm9a9pme4mgv.jpg", "Henequen rope"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/c_crop,x_0,y_83,w_640,h_477/v1771619170/atlas/mhglvnzoxzs1ufuueol1.jpg", "Henequen textile"),
  ],

  "navajo-churro": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727633/atlas/lfl3mxnpejbog7qbsrye.jpg", "Navajo-Churro sheep"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727630/atlas/qu3j8entjp3rfauoq6fd.jpg", "Navajo people and sheep", "Ken Hammond, Public domain"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727633/atlas/qq1yhh2nbczbsqh5qq40.jpg", "Navajo-Churro breeds"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619201/atlas/obffp3woc2jalytogvwp.webp", "Navajo-Churro wool"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727635/atlas/ercnuajhgqm2bil54ykw.jpg", "Navajo-Churro lambs"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727631/atlas/c1r3xytmi6ekbowjbsrc.jpg", "Navajo-Churro ewe", "Just chaos, CC BY 2.0"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727631/atlas/eyzwlfjx1hiy37bdsxac.jpg", "Navajo-Churro sheep herd", "Openverse"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727630/atlas/te2y3d2wnqeoceooqq4w.jpg", "The Comfort of Wool", "Openverse"),
  ],

  camel: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619249/atlas/kddshu1gldly58a587tf.avif", "Camel portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619250/atlas/dwr2tlw2vfcmbqhxhuo6.avif", "Camel hair fiber"),
  ],

  qiviut: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619259/atlas/ual6cgngzcjfl6wtdbk7.jpg", "Musk ox qiviut"),
  ],

  "spider-silk": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619279/atlas/er6dkflqfsskvsyvdyw2.jpg", "Spider silk web"),
  ],

  horsehair: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619278/atlas/lnnkjf82gd2q6ipf42v3.jpg", "Horsehair fiber"),
  ],

  milkweed: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619143/atlas/ombbjli9aanccysehkmu.jpg", "Milkweed fiber"),
  ],

  esparto: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619176/atlas/jksxm0rrccoesefxivqn.jpg", "Esparto grass"),
  ],

  loofah: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619291/atlas/uvw5qsdki7ykzcwbeteb.jpg", "Loofah sponge fiber"),
  ],

  rambouillet: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727450/atlas/avyjf3tsczjo6b6zpyv6.jpg", "Rambouillet ram"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727451/atlas/awvrkkwlipy98hxn7aca.jpg", "Rambouillet merino"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619192/atlas/css5nftmmei00gijyiwp.jpg", "Rambouillet wool"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727448/atlas/pnhhyoxxsrdaej7ogbwo.jpg", "Rambouillet wool top"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771727449/atlas/rutw0vnrfevyh6geo7py.jpg", "Rambouillet roving"),
  ],

  /* ── Regenerated Fibers ── */
  "viscose-rayon": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619285/atlas/g6embgv1jvxmpem5lhcz.jpg", "Viscose rayon fiber"),
  ],

  cupro: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619287/atlas/ombpcds9vikoh5i1hjhd.jpg", "Cupro fiber"),
  ],

  /* ── Dyes ── */
  indigo: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619487/atlas/pphxe9gdh5all8zke1rl.jpg", "Indigo dye vat"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619484/atlas/qmslxeyupavx9zab94pb.jpg", "Indigo plant leaves"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619501/atlas/ywsuqfika8pavfpbo6jy.jpg", "Indigo dyed fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619482/atlas/elp9xtu1sgc1ae37wxle.jpg", "Indigo pigment blocks"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619492/atlas/z7aii3oingdm6afdmz21.jpg", "Indigo dyeing process"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619489/atlas/qzdz56bvbxlu2zbsnnhv.jpg", "Indigo fabric hanging"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619499/atlas/hft6jcmbcouvpo5lobkb.jpg", "Indigo textile pattern"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619494/atlas/crah6qutqfjoqr0ehgw7.jpg", "Indigo shibori"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619497/atlas/ey61zrvm8veshdq3wmfa.jpg", "Indigo artisan"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619491/atlas/zw5gqhrgf2pcpplfzfsd.jpg", "Indigo dye shades"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619503/atlas/bubuhqiqojf0yeorda3z.jpg", "Indigo workshop"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771539118/k8k5g9ds1ld6oc3cr2ak.jpg", "Natural indigo"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619504/atlas/agwkgkwgb49heinxwiin.jpg", "Indigo dyed yarn"),
  ],

  /* ── Additional Plant Fibers ── */
  sweetgrass: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619635/atlas/cpiq70rhbutlzou9xbbk.jpg", "Sweetgrass braid"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619631/atlas/etdog21xcilwjv1ipkej.jpg", "Sweetgrass harvest"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619637/atlas/fnyi5flvohpjhpt28usm.jpg", "Sweetgrass weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619634/atlas/o04pyd78pdrlxnqlgvvf.jpg", "Sweetgrass basket"),
  ],

  raffia: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775506165/atlas/skpmybeuzezhj9yh9eor.jpg", "Raffia — Natural Fiber Atlas"),
    img("https://helenkaminski.com/cdn/shop/files/process-647x1098_0007_20252506_MADAGASCAR_C3_2739.jpg?v=1765863926", "Raffia craft, Madagascar"),
    img("https://helenkaminski.com/cdn/shop/files/process-647x1098_0006_20252506_MADAGASCAR_C3_2741.jpg?v=1765863926", "Raffia processing"),
    img("https://helenkaminski.com/cdn/shop/files/process-647x1098_0004_20252506_MADAGASCAR_DAY3_2317.jpg?v=1765863927", "Raffia harvest"),
    img("https://helenkaminski.com/cdn/shop/files/1680x1200_0001_20252506_MADAGASCAR_DAY7_5152.jpg?v=1765863927", "Raffia landscape"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619697/atlas/pkqfjcnypmzmnvvzf1fu.jpg", "Raffia fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619703/atlas/ybqb9tetqo5iinmog0gd.jpg", "Raffia weaving"),
    img("https://helenkaminski.com/cdn/shop/files/process-647x1098_0001_20252506_MADAGASCAR_DAY5_4165.jpg?v=1765863927", "Raffia workshop"),
    img("https://helenkaminski.com/cdn/shop/articles/blog_tile_c868e9d0-06c8-42bd-8b54-4dc91737cc75_1080x.png", "Raffia heritage"),
    img("https://helenkaminski.com/cdn/shop/files/double_image_0000_20252506_MADAGASCAR_C2_1558.jpg?v=1765863927", "Raffia in Madagascar"),
    img("https://helenkaminski.com/cdn/shop/files/1680x1200_0000_20252506_MADAGASCAR_DAY7_5228.jpg?v=1765863927", "Madagascar raffia"),
    img("https://helenkaminski.com/cdn/shop/files/artisans.png?v=1765863928", "Raffia artisans"),
  ],

  fique: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619742/atlas/d0bh8y4vwf0z96lhl2hk.jpg", "Fique fiber"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619743/atlas/nw0lo5hrk5xtbiff84c1.png", "Fique plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619741/atlas/jpnlu6o6y6qmzbzk5osb.jpg", "Fique processing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619746/atlas/hottvmb8kysiim0dxrge.jpg", "Fique rope"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619747/atlas/pzywv4tra242v6wmy9b6.jpg", "Fique textile"),
  ],

  /* ── Batch 3 Gallery Entries ── */
  "avocado-dye": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748139/atlas/pylksiisbzbatsercdsf.jpg", "Avocado dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748136/atlas/byrtnhtm2hjvhcrhk3or.jpg", "Avocado pit dye process"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748137/atlas/otlv91nbmqibdqawfu9j.jpg", "Avocado natural dyeing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748142/atlas/ymkuku7od9bgl0frjtii.jpg", "Avocado pit dye bath"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748143/atlas/qackf1qalygbei5yynh3.jpg", "Avocado dye water"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748144/atlas/bszxodudsg77kxzybfcr.jpg", "Avocado dye aging"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748138/atlas/gph2xazgiamkeqlbx4r5.jpg", "Avocado pit dye simmering"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748146/atlas/oqqkbgdnlc7awtryw5o6.jpg", "Avocado dye pink yarn"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748141/atlas/vwvewhuobjk52oricawm.webp", "Avocado dye two tones"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748147/atlas/tbxcmzq3or9j6dmbxouf.png", "Avocado dye tips"),
  ],

  annatto: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743372/atlas/uhw0y6ab5ypyow5plboy.jpg", "Natural annatto dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743365/atlas/skem5foqammnjere2fka.jpg", "Annatto dye tree"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743370/atlas/xnmtnojdkhflpqvibrw0.jpg", "Annatto seeds close-up", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743367/atlas/izgrnmm30dgbvffp31w9.jpg", "Annatto pod on branch"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743371/atlas/wtkguhb9almv2xzdyuqh.jpg", "Annatto seeds in hand"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743368/atlas/atlxazja3ybp3dvyt3z5.jpg", "Bixa orellana in Bali", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743367/atlas/r3laoccnisiszgdsyq8o.jpg", "Annatto tree flowers"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743369/atlas/mwbrselxxvi6ektmjpg6.jpg", "Bixa orellana plant"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743372/atlas/s8ppioiluav6ott0dlxa.jpg", "Fiber dyeing workshop"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743373/atlas/n6atjtn0xwewzhdhaemy.jpg", "Traditional fiber dyeing"),
  ],

  chlorophyll: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828608/atlas/bdzw3komfk1t1isdnpbh.webp", "Green wool yarn skeins"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828604/atlas/uv7wekjoclf5exxruyri.jpg", "Chlorophyllin dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828600/atlas/lvf4hv5glbfcu5ld6rgg.jpg", "Natural dye store greens", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828606/atlas/zcg89qvfaudqaolhvp7v.jpg", "Chlorophyllin powder", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828605/atlas/xkrrpm4buof5ubrwksk4.jpg", "Chlorophyllin dye sample"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828602/atlas/s0mapz7tq4gjba2d9jpd.jpg", "Bold greens from dye plants"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828605/atlas/h9fmyo4d1pc9z2kwgluy.jpg", "Chlorophyll extract", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771828609/atlas/evgqgcoiejhwzxqvtrrj.jpg", "Green natural dye"),
  ],

  blackberry: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619529/atlas/o7dlr8jlejkgdxxcviwe.jpg", "Blackberry dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824963/atlas/w2nndoenkf8plirzitqo.jpg", "Natural dyeing blackberry"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824964/atlas/nautbnge3hu6s6txv3i0.jpg", "Blackberry dyed linen", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824965/atlas/qz6b5le1e0e6dnhmtveh.jpg", "Blackberry hand dyed yarn", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824965/atlas/ajwv9mtdvhmyzqlrgupc.jpg", "Blackberry leaf dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824966/atlas/sbvhdbhythcz50fusbwm.jpg", "Blackberry dyed sock yarn", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771824967/atlas/euvvedlm9dmctsfm8glr.jpg", "Berry dye fastness test"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771825048/atlas/d1ledvtrmrnhjkht4bo6.jpg", "Blackberry dyed threads"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771825049/atlas/e6uyh2bktod0cwclz8zl.jpg", "Blackberry wool dye"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771825050/atlas/mrw7xc4s7szguoth73uv.webp", "Blackberry dye pot"),
  ],

  elderberry: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743812/atlas/zsdtlskyz16joossntub.jpg", "Sambucus nigra"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743813/atlas/dgnctkk95pitktigsh4c.jpg", "Elderberries with flowers", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743814/atlas/uizx38ifzrz7yg08dpqh.jpg", "Ripe elderberries"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771743815/atlas/igsaswmmz9sdkhimkph2.jpg", "Elderberry plant"),
  ],

  batik: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771750057/atlas/jt6mobl9px2y6dha0lae.jpg", "Batik wax printing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771750063/atlas/spd9kifiyyb5nsobg5qq.jpg", "Artisan batik handprinting"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771750059/atlas/chy8cz7iovatfhqjamj6.png", "Traditional batik hand printing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771750063/atlas/gnfiidptghq47xfcvua0.jpg", "Batik printing technique"),
  ],

  shibori: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619573/atlas/aybqbigu3meg9u927sr6.jpg", "Shibori indigo resist"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619572/atlas/j7dt0xxyjeq29cgj7bb0.jpg", "Shibori fabric patterns"),
  ],

  "tie-dye": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619575/atlas/rhdui5rkwvsnxbknnntj.jpg", "Tie-dye fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619576/atlas/eddqqrgwpiri9kt7vazl.jpg", "Tie-dye patterns"),
  ],

  lac: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771657052/atlas/agl084ol9eibcie443p8.jpg", "Lac dye resin"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771657051/atlas/fuynhm3yttsyjplfsups.jpg", "Lac dye raw"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771657051/atlas/woxwijhqyf2s4zfjgqcm.jpg", "Lac dye processed"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771657053/atlas/iqjm8dhxz0lrim5t0hei.jpg", "Lac dye pigment"),
  ],

  ayate: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771742430/atlas/cj0uvxenofxwhz8bicli.jpg", "Ayate back-scrubber cloth"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771742431/atlas/accb5pyahaml6zathyex.webp", "Ayate bathing cloth"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771742432/atlas/guwughaaiftye9wkerjt.jpg", "Ayate loofah"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619685/atlas/mhehbhrvqb9e10ma5dxe.jpg", "Ayate agave cloth"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771742434/atlas/fkkukgaxkk4mclrpnjfn.jpg", "Ayate agave fiber washcloth", undefined, "portrait"),
  ],

  krajood: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619689/atlas/lxq5ebpnuuvn3lu49x17.jpg", "Krajood sedge weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619695/atlas/i1xto24x8md3yaazsyxd.jpg", "Krajood basket"),
  ],

  carpet: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748833/atlas/fop9ksro9me4e8yhhte2.jpg", "Persian carpet masterpiece"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619738/atlas/fztbfiyix1yq7l6fihpg.jpg", "Carpet weaving"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619740/atlas/a0dis4pmxfjbsvyacd71.jpg", "Hand-knotted carpet"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748834/atlas/mmn6l2m6rbdsdzmosqdd.jpg", "Persian rug outdoor"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748836/atlas/ccidzzk6t71lphjb8bha.jpg", "Antique Persian carpet"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771748837/atlas/elf2gctf6ty231kt2cru.jpg", "Swedish carpet exhibition"),
  ],

  knitting: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628165/atlas/z1yghqwymlr5gjvk7a0j.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628158/atlas/ylpytdyuyh4sjfmgvwh3.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628707/atlas/cleb8cwwctcypwdrnslf.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775627889/atlas/g6ytepocmrgotcyfzmmg.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628115/atlas/iogbrkwye5olyhcekls7.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628243/atlas/aihyqsvv9l9is1gz0yuy.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628100/atlas/u8rqs6xmr2pia397osst.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628108/atlas/f0pfg49truwcu6xc6k5g.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628134/atlas/owgfgwdjfbuyuitr47sn.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628181/atlas/n5zmd8jrsid47ofdqpee.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628239/atlas/sdfw6dpjbp2nqzbdpl5v.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628607/atlas/lmsyblcljfoy0teqc26w.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628680/atlas/vp1torkhdysbtwvll29a.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628741/atlas/s0ugxnzkm9qd3p1tmfcj.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628755/atlas/fchfpm7iojih7vvsqqcs.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1775628788/atlas/cz9w1i3k437lfwgqqncf.jpg", "Knitting — reference"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619379/atlas/jtv4qymbqpncu4dfnjfw.jpg", "Knitting — hero"),
    img("https://helenkaminski.com/cdn/shop/files/stitches-1080x1350_0001_helen_kaminski_SS25_Kirana_crochet_stitch_612x.jpg?v=1765934435", "Kirana stitch detail"),
    img("https://helenkaminski.com/cdn/shop/files/stitches-1080x1350_0002_helen_kaminski_SS25_Mala_crochet_stitch_612x.jpg?v=1765934435", "Mala stitch detail"),
    img("https://media.jamesdunloptextiles.com/image-transform/8cu89TjtOYIFJGZftnClsWL5NRc=/fit=cover,width=563,height=423,format=auto/https://media.jamesdunloptextiles.com/media/news/2022_05/26ea8bc023cf110f9f112c336a2e8315--knit-crochet-spinning_MqRLCCU.jpg", "Knit, crochet, and spinning studio"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619350/atlas/xbyvbhkqvsoodplxb8de.jpg", "Cable knit texture"),
  ],

  "block-print": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619651/atlas/dxneiijpebu9cqqvnxfj.jpg", "Block printing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619654/atlas/pd51lqlvtleqqliogsgz.jpg", "Block print fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619655/atlas/sl6nw9dbuwue5wirt7z6.jpg", "Block print stamps"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619657/atlas/okiboucwyfswctais7zo.jpg", "Hand block printing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619659/atlas/fa7cd6syjxeoz0mxcn72.jpg", "Block print pattern"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619660/atlas/a9lsqi1gvsdzbuxfspfi.jpg", "Indian block print"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619661/atlas/t6onachc1irepisoqijs.jpg", "Block print workshop"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619664/atlas/dnblcqtkwl5mpkxtn1wr.jpg", "Block print detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619665/atlas/xifyx1twb4j6nwjk0jlj.jpg", "Block print artisan"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619666/atlas/hcdqk6vxtontna2qwfj2.jpg", "Fabric block printing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619668/atlas/g9unynsnnf6mfhwc5v5r.jpg", "Block print textiles"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619671/atlas/kbmnwfqa1k2lyjzjiqzh.jpg", "Block print tradition"),
  ],

  "leno-weave": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619672/atlas/ywiwxtgbeos81eqcsj7i.webp", "Leno weave structure"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619678/atlas/yep56issntitkamckuip.jpg", "Leno weave fabric"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619679/atlas/exfixrapre9dvunfw1dc.webp", "Leno gauze"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619680/atlas/smd8ihre47qiqdzxscqb.jpg", "Leno weave detail"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619683/atlas/tne7hfzuvlhzskcckynp.png", "Leno weave diagram"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619684/atlas/knrxuq33lzwcjl1wwjxb.jpg", "Leno weave textile"),
  ],

  henna: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619642/atlas/y3wqh73yyza0ijy66u5g.jpg", "Henna art"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619643/atlas/cuqdudnsszivdr0pzdus.jpg", "Henna leaf dye"),
  ],

  lotus: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619641/atlas/norl5xkkugaq4ayshyxo.jpg", "Lotus fiber extraction"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619639/atlas/ldug89ynybqnhjbjsquf.jpg", "Lotus stem fiber"),
  ],

  alum: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771717718/atlas/oxyxgyuqwur3kfmfzy3c.webp", "Alum crystals"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771717719/atlas/pgeas8x5qcpnipy6mddl.jpg", "Shaving alum in bowl"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771717721/atlas/f2dbsta3qrplhchdinnn.jpg", "Potassium alum stones"),
  ],

  alder: [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771619478/atlas/i8g9l6klvx34ab7t7ioz.jpg", "Alder bark"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771716899/atlas/kna8sjesjydo6eqz6qfk.jpg", "Yellow alder flowers"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771717621/atlas/sxc3zklc9ixps0xcjt6r.webp", "Red alder bark chips"),
  ],

  "black-walnut": [
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815921/atlas/ia2gr8hto0ryner6uzxt.jpg", "Walnut hull dyeing"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815923/atlas/l78guooazegu4r7ec3ks.jpg", "Black walnut dye solution", undefined, "portrait"),
    img("https://res.cloudinary.com/dawxvzlte/image/upload/v1771815922/atlas/sq0niv6sxpvfscj5wmev.jpg", "Walnut tannin extraction"),
  ],
};

/** Look up gallery images for a fiber by ID. Returns empty array if none found. */
export function getGalleryImages(fiberId: string): GalleryImageEntry[] {
  return galleryData[fiberId] ?? [];
}