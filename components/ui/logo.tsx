import logo from "@/public/logo.png";
import Image from "next/image";

// type LogoProps = {
//   logoStyles?: string;
// };

export default function Logo() {
  return (
    // <Image
    //   className={logoStyles ?? ''}
    //   src='/logo.png'
    //   width={80}
    //   height={100}
    //   alt='BRUSS'
    //   // priority={false}
    // />
    <Image
      src={logo}
      className="w-24"
      // className={logoStyles ?? ''}
      // // You don't need to specify
      // //either height nor width but
      // // you should if you wan't to
      // // change the size
      // // height={100}
      // width={80}
      // // Optional blur-up
      // // while loading
      // // placeholder='blur-sm'
      alt="BRUSS"
    />
  );
}
