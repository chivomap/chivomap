import { IoMapSharp, IoSearchSharp as SearchIcon } from "react-icons/io5";
import { WiEarthquake as EarthquakeIcon } from 'react-icons/wi';
import { useLayoutStore, LayoutStates } from '../../../shared/store/layoutStore';

export const PanelConfig = () => {
  const { layoutStates, updateLayoutStates } = useLayoutStore();

  const options: { name: string; icon: JSX.Element; stateKey: keyof LayoutStates, desactiveKey: keyof LayoutStates | null }[] = [
    { name: 'Search', icon: <SearchIcon />, stateKey: 'search', desactiveKey: 'department' },
    { name: 'Select Depto', icon: <IoMapSharp />, stateKey: 'department', desactiveKey: 'search' },
    { name: 'Sismos', icon: <EarthquakeIcon />, stateKey: 'earthquake', desactiveKey: null },
  ];

  const handleToggle = (key: keyof LayoutStates, desactiveKey: keyof LayoutStates | null) => {
    let newState = { ...layoutStates, [key]: !layoutStates[key] };
    if (newState[key] && desactiveKey) {
      newState = { ...newState, [desactiveKey]: false };
    } else if (!newState[key] && desactiveKey) {
      newState = { ...newState, [desactiveKey]: true };
    }
    updateLayoutStates(newState);
  };

  return (
    <>
      <div className='
        absolute right-0 min-w-[240px] top-[-160px] h-[140px] bg-primary py-4 pt-2 config-panel
        text-white/80 overflow-y-scroll c-scrollbar overflow-x-hidden rounded-xl
        flex flex-col items-center justify-center'>
        
        <div className='px-4'>
          {options.map((option) => (
            <div key={option.name} className='flex gap-2 items-center justify-between text-lg w-full'>
              <div className="flex gap-2 items-center justify-center">
                {option.icon}
                <p>{option.name}</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={layoutStates[option.stateKey]}
                  onChange={() => handleToggle(option.stateKey, option.desactiveKey)}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <span className='
        config-panel
        absolute top-[-20px] right-[10px]
        w-0 h-0
        border-l-[15px] border-t-[15px]
        border-l-transparent border-r-transparent border-t-primary
      '></span>
    </>
  );
};
